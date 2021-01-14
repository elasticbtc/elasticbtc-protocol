// https://docs.basis.cash/mechanisms/token-distribution

// 2 EBTC in first 5 days distributed to pools
const INITIAL_EBTC_FOR_POOLS = 2;

// target fully diluted market cap: 100000.0001
// 1/10th of the supply of basis.cash
const INITIAL_EBS_FOR_WBTC_EBTC = 75000;
const INITIAL_EBS_FOR_WBTC_EBS = 25000;

const POOL_START_DATE = Date.parse('2021-01-18T04:00:00Z') / 1000;

const ebtcPools = [
  { contractName: 'EBTCDAIPool', token: 'DAI' },
  { contractName: 'EBTCSBTCPool', token: 'SBTC' },
  { contractName: 'EBTCBADGERPool', token: 'BADGER' },
  { contractName: 'EBTCRenBTCPool', token: 'RenBTC' },
  { contractName: 'EBTCBACPool', token: 'BAC' },
  { contractName: 'EBTCHBTCPool', token: 'HBTC' },
];

const ebsPools = {
  WBTCEBTC: {
    contractName: 'WBTCEBTCLPTokenSharePool',
    token: 'WBTC_EBTC-LPv2',
  },
  WBTCEBS: { contractName: 'WBTCEBSLPTokenSharePool', token: 'WBTC_EBS-LPv2' },
};

module.exports = {
  POOL_START_DATE,
  INITIAL_EBTC_FOR_POOLS,
  INITIAL_EBS_FOR_WBTC_EBTC,
  INITIAL_EBS_FOR_WBTC_EBS,
  ebtcPools,
  ebsPools,
};
