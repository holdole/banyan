export function formatAddress(address) {
    const firstSix = address.slice(0, 6);
    const lastFour = address.slice(-4);
    return firstSix + '...' + lastFour;
}

export function formatTime(utcTimeString) {
    const utcTime = new Date(utcTimeString);
    const now = new Date();
    const timeDiff = now - utcTime;
    const diffInMinutes = Math.floor(timeDiff / 60000);
    const diffInHours = Math.floor(diffInMinutes / 60);
    
    if (diffInMinutes < 60) {
        return `${diffInMinutes}m`;
    } else if (diffInHours < 24) {
        return `${diffInHours}h`;
    } else {
        return utcTime.toLocaleString('en-US', { month: 'short', day: 'numeric' });
    }
}

export function formatFollow(number) {
    const num = Number(number);
    if (isNaN(num) || num <= 0) {
        return '';
    }
    if (num < 1000) {
        return Math.floor(num).toString();
    }
    const formattedNum = (num / 1000).toFixed(1);
        return parseFloat(formattedNum).toString() + 'K';
}

export function formatPrice(number) {
    const num = Number(number);
    if (isNaN(num) || num <= 0) {
        return '';
    }
    if (num < 1) {
        let decimalPlaces = 0;
        let tempNum = num;
        while (tempNum < 1 && decimalPlaces < 16) {
            decimalPlaces++;
            tempNum *= 10;
        }

        if (decimalPlaces >= 5) {
            const significantDigits = num.toFixed(decimalPlaces + 2).slice(2);
            const zeroCount = significantDigits.match(/^0+/)[0].length;
            let nonZeroDigits = significantDigits.slice(zeroCount);
            nonZeroDigits = nonZeroDigits.replace(/\.?0+$/, '');
            if (nonZeroDigits.length > 2) {
                nonZeroDigits = nonZeroDigits.slice(0, 5);
            }

            return '$' + `0.0<sub class="subscript-normal">${zeroCount}</sub>${nonZeroDigits}`;
        } else {
            decimalPlaces = decimalPlaces + 3
            let formattedAmount = num.toFixed(decimalPlaces);
            formattedAmount = parseFloat(formattedAmount).toString();
            return '$' + formattedAmount;
        }
    }
    
    if (num > 1 && num < 10) {
        return '$' + num.toFixed(2);
    } else if (num > 10 && num <= 1000) {
        return '$' + num.toFixed(0);
    } else if (num > 1000 && num < 1000000) {
        return '$' + (num / 1000).toFixed(2) + 'K';
    }
}

export function formatMarketCap(number) {
    const num = Number(number);
    if (isNaN(num) || num <= 0) {
        return '';
    }

    if (num > 1 && num < 1000) {
        return num.toFixed(1);
    } else if (num < 1000000) {
        return (num / 1000).toFixed(1) + 'K';
    } else if (num < 1000000000) {
        return (num / 1000000).toFixed(1) + 'M';
    } else {
        return (num / 1000000000).toFixed(1) + 'B';
    } 
}

export function formatUSD(number1, number2) {
    const numberToUse = (Number(number1) === 0 || Number(number1) >= 1000000) ? number2 : number1;
    
    const num = Number(numberToUse);
    if (isNaN(num) || num <= 0) {
        return '0';
    }
 
    function formatDecimal(num) {
        return Number(num).toFixed(2);
    }
 
    function addCommas(num) {
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }
 
    if (num < 1) {
        return formatDecimal(num);
    }
 
    if (num >= 1 && num < 1000) {
        return formatDecimal(num);
    } else if (num < 1000000) {
        return addCommas(formatDecimal(num));
    } else if (num < 1000000000) {
        return addCommas(formatDecimal(num / 1000000)) + 'M';
    } else {
        return addCommas(formatDecimal(num / 1000000000)) + 'B';
    }
 }


export function formatNumber(number) {
    const num = Number(number);
    if (isNaN(num) || num <= 0) {
        return '0';
    }

    function removeTrailingZeros(str) {
        return str.replace(/\.?0+$/, '');
    }

    if (num < 1) {
        let decimalPlaces = 2;
        let tempNum = num;
                while (tempNum < 0.1 && decimalPlaces < 6) {
            decimalPlaces++;
            tempNum *= 10;
        }
        let formattedAmount = num.toFixed(decimalPlaces);
        formattedAmount = parseFloat(formattedAmount).toString();
        formattedAmount = formattedAmount.toLocaleString('en-US');
        return formattedAmount;
    }
    if (num >= 1 && num < 1000) {
        return removeTrailingZeros(num.toFixed(2));
    } else if (num < 1000000) {
        return removeTrailingZeros((num / 1000).toFixed(1)) + 'K';
    } else if (num < 1000000000) {
        return (num / 1000000).toFixed(0) + 'M';
    } else {
        return (num / 1000000000).toFixed(0) + 'B';
    } 
}

export function formatBalance(number) {
    const num = Number(number);
    if (isNaN(num) || num <= 0) {
        return '0';
    }

    function removeTrailingZeros(str) {
        return str.replace(/\.?0+$/, '');
    }

    if (num < 1) {
        let decimalPlaces = 3;
        let tempNum = num;
                while (tempNum < 0.1 && decimalPlaces < 6) {
            decimalPlaces++;
            tempNum *= 10;
        }
        let formattedAmount = num.toFixed(decimalPlaces);
        formattedAmount = parseFloat(formattedAmount).toString();
        formattedAmount = formattedAmount.toLocaleString('en-US');
        return formattedAmount;
    }
    if (num >= 1 && num < 1000) {
        return removeTrailingZeros(num.toFixed(2));
    } else if (num < 1000000) {
        return removeTrailingZeros((num / 1000).toFixed(1)) + 'K';
    } else if (num < 1000000000) {
        return (num / 1000000).toFixed(0) + 'M';
    } else {
        return (num / 1000000000).toFixed(0) + 'B';
    } 
}


export function getTimeDifference(dateString) {
    const givenDate = new Date(dateString);
    const currentDate = new Date();
  
    const timeDiff = currentDate - givenDate;
  
    const secondsDiff = Math.floor(timeDiff / 1000);
    const minutesDiff = Math.floor(secondsDiff / 60);
    const hoursDiff = Math.floor(minutesDiff / 60);
    const daysDiff = Math.floor(hoursDiff / 24);
  
    if (hoursDiff < 1) {
    return `${minutesDiff}m`;
    } else if (daysDiff < 1) {
    return `${hoursDiff}h`;
    } else {
    return `${daysDiff}d`;
    }
  }

  export function getShortAddress(address) {
    if (!address || address.length < 10) return address;
    return address.slice(0, 6) + '...' + address.slice(-4);
  }
