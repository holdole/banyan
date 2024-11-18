async function fetchBaseTransaction(transactionHash, retryCount = 2) {
  const myHeaders = new Headers();
  myHeaders.append("Content-Type", "application/json");
  myHeaders.append("X-API-KEY", process.env.VUE_APP_BITQUERY_API_KEY);
  myHeaders.append("Authorization", `Bearer ${process.env.VUE_APP_BITQUERY_STREAMING}`);

  const raw = JSON.stringify({
    query: `
    query MyQueryWithVariables($hash: [String!]) {
      EVM(dataset: combined, network: base) {
        buyside: DEXTrades(
          where: {Block: {Date: {since: "2024-08-01"}}, TransactionStatus: {Success: true}, Transaction: {Hash: {in: $hash}}}
        ) {
          Block {
            Time
          }
          Transaction {
            Value
            Hash
          }
          Trade {
            Buy {
              Amount
              Currency {
                Name
                Symbol
                SmartContract
                Decimals
              }
              AmountInUSD
            }
            Sell {
              Amount
              Currency {
                Name
                SmartContract
                Symbol
                Decimals
              }
              AmountInUSD
            }
            Dex {
              ProtocolVersion
            }
          }
        }
      }
    }      
    `,
    variables: {
        hash: transactionHash
    }
});

  const requestOptions = {
      method: 'POST',
      headers: myHeaders,
      body: raw,
      redirect: 'follow'
  };

  try {
      const response = await fetchRetry("https://streaming.bitquery.io/graphql", requestOptions);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();

      if (result.errors && result.errors.length !== 0) {
        if (retryCount > 0) {
            await delay(1000);
            return await fetchBaseTransaction(transactionHash, retryCount - 1);
        }
      }
      let data = await result.data.EVM.buyside
      let processedData
      if (!data) {
          processedData = []
      } else {
        processedData = await handleProcessData(data);
        processedData = await Promise.all(data.map(async item => {
          item.Trade.newBuy = item.Trade.Buy
          item.Trade.newSell = item.Trade.Sell
          delete item.Trade.Buy
          delete item.Trade.Sell
          item.Trade.Buy = item.Trade.newSell
          item.Trade.Sell = item.Trade.newBuy
          delete item.Trade.newSell
          delete item.Trade.newBuy

          if (Number(item.Transaction.Value) > 0 && item.Trade.Sell.Currency.SmartContract == "0x4200000000000000000000000000000000000006") {
              item.Trade.Sell.Currency.Symbol = 'ETH'
          } else if(item.Trade.Buy.Currency.SmartContract == "0x4200000000000000000000000000000000000006") {
              item.Trade.Buy.Currency.Symbol = 'ETH'
          }

          return {
              ...item,
          };
        }));
      }
      return processedData;
  } catch {
    if (retryCount >= 0) {
      await delay(1000);
      return await fetchBaseTransaction(transactionHash, retryCount - 1);
    } else {
      let processedData = []
      return processedData;
    }
  }
}

function fetchWithTimeout(url, options, timeout = 40000) {
return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
        reject(new Error('Request timed out'));
    }, timeout);
    fetch(url, options).then(
        response => {
            clearTimeout(timer);
            resolve(response);
        },
        err => {
            clearTimeout(timer);
            reject(err);
        }
    );
});
}

async function fetchRetry(url, options, n = 2) {
try {
    return await fetchWithTimeout(url, options);
} catch (err) {
    if (n === 1) throw err;
    return await fetchRetry(url, options, n - 1);
}
}


function handleProcessData(processData) {
let i = 0;
while (i < processData.length) {
    let item = processData[i];
    let j = i + 1;

    while (j < processData.length) {
        let compareItem = processData[j];

        if (item.Transaction.Hash === compareItem.Transaction.Hash && item.Trade.Dex.ProtocolVersion === compareItem.Trade.Dex.ProtocolVersion) {
            if (item.Trade.Buy.Currency.SmartContract === compareItem.Trade.Sell.Currency.SmartContract) {
                item.Trade.Buy = compareItem.Trade.Buy;
                processData.splice(j, 1);
            } else if (item.Trade.Sell.Currency.SmartContract === compareItem.Trade.Buy.Currency.SmartContract) {
                item.Trade.Sell = compareItem.Trade.Sell;
                processData.splice(j, 1);
            } else {
                j++;
            }
        } else {
            j++;
        }
    }

    i++;
}

return processData;
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  fetchBaseTransaction
};