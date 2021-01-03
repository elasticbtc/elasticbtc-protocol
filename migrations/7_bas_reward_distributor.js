const {
  ebsPools,
  INITIAL_EBS_FOR_WBTC_EBTC,
  INITIAL_EBS_FOR_WBTC_EBS,
} = require('./pools');

// Pools
// deployed first
const Share = artifacts.require('Share');
const InitialShareDistributor = artifacts.require('InitialShareDistributor');

// ============ Main Migration ============

async function migration(deployer, network, accounts) {
  const unit = web3.utils.toBN(10 ** 18);
  const totalBalanceForWBTCEBTC = unit.muln(INITIAL_EBS_FOR_WBTC_EBTC);
  const totalBalanceForWBTCEBS = unit.muln(INITIAL_EBS_FOR_WBTC_EBS);
  const totalBalance = totalBalanceForWBTCEBTC.add(totalBalanceForWBTCEBS);

  const share = await Share.deployed();

  const lpPoolWBTCEBTC = artifacts.require(ebsPools.WBTCEBTC.contractName);
  const lpPoolWBTCEBS = artifacts.require(ebsPools.WBTCEBS.contractName);

  await deployer.deploy(
    InitialShareDistributor,
    share.address,
    lpPoolWBTCEBTC.address,
    totalBalanceForWBTCEBTC.toString(),
    lpPoolWBTCEBS.address,
    totalBalanceForWBTCEBS.toString()
  );
  const distributor = await InitialShareDistributor.deployed();

  await share.mint(distributor.address, totalBalance.toString());
  console.log(
    `Deposited ${INITIAL_EBS_FOR_WBTC_EBTC} BAS to InitialShareDistributor.`
  );

  console.log(
    `Setting distributor to InitialShareDistributor (${distributor.address})`
  );
  await lpPoolWBTCEBTC
    .deployed()
    .then((pool) => pool.setRewardDistribution(distributor.address));
  await lpPoolWBTCEBS
    .deployed()
    .then((pool) => pool.setRewardDistribution(distributor.address));

  await distributor.distribute();
}

module.exports = migration;
