// https://docs.basis.cash/mechanisms/yield-farming
const INITIAL_EBTC_FOR_POOLS = 2;
const INITIAL_EBS_FOR_WBTC_EBTC = 25;
const INITIAL_EBS_FOR_WBTC_EBS = 8;

const POOL_START_DATE = Date.parse('2020-11-30T00:00:00Z') / 1000;

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
