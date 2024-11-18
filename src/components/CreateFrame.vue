<template>
  <div class="create-social-link">
    <van-form @submit="generateSocialLink">
      <van-config-provider :theme-vars="themeVars">
      <van-nav-bar
        title="Create Frame"
        left-arrow
        @click-left="$router.back()"
        /> 
      </van-config-provider>
      <van-cell-group inset>
        <van-field
          name="activity"
          label="Activities"
        >
          <template #input>
            <van-radio-group v-model="formData.activity" direction="horizontal">
              <van-radio name="Swap">Swap</van-radio>
            </van-radio-group>
          </template>
        </van-field>

        <van-field
          name="chain"
          label="Chain"
        >
          <template #input>
            <van-radio-group v-model="formData.chain" direction="horizontal">
              <van-radio name="base">Base</van-radio>
              <van-radio name="eth">Eth</van-radio>
            </van-radio-group>
          </template>
        </van-field>

        <van-field
          v-model="formData.tokenAddress"
          name="tokenAddress"
          label="Token Address"
          :error="tokenAddressError !== ''"
          :error-message="tokenAddressError"
        >
          <template #input>
            <textarea
              v-model="formData.tokenAddress"
              class="custom-textarea"
              placeholder="Enter token address"
              rows="2"
            ></textarea>
          </template>
        </van-field>

        <van-field
          name="referralAddress"
          label="Referral Address"
          :error="referralAddressError !== ''"
          :error-message="referralAddressError"
        >
          <template #input>
            <textarea
              v-model="formData.referralAddress"
              class="custom-textarea"
              placeholder="Enter referral address"
              rows="2"
            ></textarea>
          </template>
        </van-field>
      </van-cell-group>

      <div style="margin: 16px;">
        <van-button round block type="primary" native-type="submit">
          Submit
        </van-button>
      </div>
    </van-form>
  </div>
</template>

<script>
import Web3 from 'web3';
import { ref, reactive } from 'vue';

export default {
  setup() {
    const formData = reactive({
      activity: 'Swap',
      chain: '',
      tokenAddress: '',
      referralAddress: ''
    });

    const socialLink = ref('');
    const tokenAddressError = ref('');
    const referralAddressError = ref('');

    const getWeb3Instance = (chain) => {
      let provider;
      if (chain === 'base') {
        provider = process.env.VUE_APP_WEB3BASE_ALCHEMY
      } else if (chain === 'eth') {
        provider = process.env.VUE_APP_WEB3ETH_ALCHEMY
      } else {
        throw new Error('Unsupported chain');
      }
      return new Web3(new Web3.providers.HttpProvider(provider));
    };

    const isValidContractAddress = async (web3, address) => {
      const code = await web3.eth.getCode(address);
      return code !== '0x' && code !== '0x0';
    };

    const themeVars = reactive({
      navBarIconColor: '#000000',
      navBarTextColor: '#000000',
    });

    const generateSocialLink = async () => {
      tokenAddressError.value = '';
      referralAddressError.value = '';

      if (!formData.tokenAddress.trim()) {
        tokenAddressError.value = 'Token Address cannot be empty';
        return;
      }

      const web3 = getWeb3Instance(formData.chain);

      if (!web3.utils.isAddress(formData.tokenAddress)) {
        tokenAddressError.value = 'Invalid token address';
        return;
      }

      const isValidContract = await isValidContractAddress(web3, formData.tokenAddress);
      if (!isValidContract) {
        tokenAddressError.value = 'Invalid contract address';
        return;
      }

      if (formData.referralAddress && !web3.utils.isAddress(formData.referralAddress)) {
        referralAddressError.value = 'Invalid referral address';
        return;
      }

      const baseUrl = `https://app.banyan.top/api/frame/swap/${formData.chain}/${formData.tokenAddress}`;
      socialLink.value = formData.referralAddress ? `${baseUrl}?referral=${formData.referralAddress}` : baseUrl;
      const castText = `Check out my Banyan swap!`;
      window.parent.postMessage({
        type: "createCast",
        data: {
          cast: {
            text: castText,
            embeds: [socialLink.value]
          }
        }
      }, "*");
    };



    return {
      themeVars,
      formData,
      socialLink,
      tokenAddressError,
      referralAddressError,
      generateSocialLink,
    };
  }
};
</script>

<style scoped>

.create-social-link {
  max-width: 450px;
  width: 100%;
  margin-left: auto;
  margin-right: auto;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  background: #ffffff;
}
.custom-textarea {
  width: 100%;
  border: none;
  resize: none;
  outline: none;
  font-size: 14px;
  line-height: 1.5;
  padding: 4px 0;
  background-color: transparent;
}

.custom-textarea::placeholder {
  color: #969799;
}
</style>