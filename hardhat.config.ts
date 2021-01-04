import '@nomiclabs/hardhat-ethers';
import '@nomiclabs/hardhat-etherscan';
import 'hardhat-gas-reporter';
import 'solidity-coverage';

export default {
  default: 'hardhat',
  networks: {
    hardhat: {},
    kovan: {
      url: `https://kovan.infura.io/v3/${process.env.INFURA_PROJECT_ID}`,
      accounts: {
        mnemonic: process.env.KOVAN_MNEMONIC
          ? process.env.KOVAN_MNEMONIC.toString().trim()
          : '',
      },
    },
  },
  solidity: {
    version: '0.6.12',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  paths: {
    sources: './contracts',
    tests: './test',
    cache: './build/cache',
    artifacts: './build/artifacts',
  },
  gasReporter: {
    currency: 'USD',
    enabled: true,
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
};
