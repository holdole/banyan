import { createConfig, http } from '@wagmi/core'
import { base, mainnet } from 'viem/chains'
import { walletConnect } from '@wagmi/connectors'
import { injected } from '@wagmi/connectors'
import { metaMask } from '@wagmi/connectors'

export const projectId = process.env.VUE_APP_WEB3MODAL_PROJECTID

const detectDevice = () => {
  if (typeof window === 'undefined') return 'Desktop';
  
  const userAgent = navigator.userAgent || navigator.vendor || window.opera;
  
  if (/android/i.test(userAgent)) {
    return 'Android';
  } else if (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream) {
    return 'iOS';
  } else {
    return 'Desktop';
  }
};

const createDeviceSpecificConfig = () => {
  const deviceType = detectDevice();
  let connectors
  if (deviceType === 'Desktop') {
    connectors = [
      injected(),
      walletConnect({ projectId }),
    ];
  }

  if (deviceType !== 'Desktop') {
    connectors = [
      metaMask({
        useDeeplink:true,
      }),
    ];
  }

  return createConfig({
    chains: [mainnet, base],
    connectors: connectors,
    transports: {
      [mainnet.id]: http(),
      [base.id]: http(),
    },
    projectId,
  });
};

export const config = createDeviceSpecificConfig();
