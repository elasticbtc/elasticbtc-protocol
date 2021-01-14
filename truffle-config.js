const HDWalletProvider = require('@truffle/hdwallet-provider');
const kovanMnemonic = process.env.KOVAN_MNEMONIC
  ? process.env.KOVAN_MNEMONIC.toString().trim()
  : null;
const mainnetMnemonic = process.env.MAINNET_MNEMONIC
  ? process.env.MAINNET_MNEMONIC.toString().trim()
  : null;

module.exports = {
  networks: {
    development: {
      host: '127.0.0.1',
      port: 7545,
      network_id: '*',
      gasPrice: 50000000000,
      gas: 20000000,
    },
    kovan: {
      provider: () =>
        new HDWalletProvider(
          kovanMnemonic,
          `https://kovan.infura.io/v3/${process.env.INFURA_PROJECT_ID}`
        ),
      network_id: '42',
      gasPrice: 10000000000,
    },
    mainnet: {
      provider: () =>
        new HDWalletProvider(
          mainnetMnemonic,
          `https://mainnet.infura.io/v3/${process.env.INFURA_PROJECT_ID}`
        ),
      network_id: '1',
      gasPrice: 42000000000,
    },
  },

  // Set default mocha options here, use special reporters etc.
  mocha: {
    // timeout: 100000
  },

  // Configure your compilers
  compilers: {
    solc: {
      version: '0.6.12+commit.27d51765', // Fetch exact version from solc-bin (default: truffle's version)
      // docker: true,        // Use "0.5.1" you've installed locally with docker (default: false)
      settings: {
        optimizer: {
          enabled: true,
          runs: 200,
        },
        //  evmVersion: "byzantium"
      },
    },
  },
};
