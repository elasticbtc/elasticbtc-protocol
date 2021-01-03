const knownContracts = require('./known-contracts');
const { POOL_START_DATE } = require('./pools');
const { readAddresses, writeAddresses } = require('./util');

const Cash = artifacts.require('Cash');
const Share = artifacts.require('Share');
const Oracle = artifacts.require('Oracle');
const MockWBTC = artifacts.require('MockWBTC');
const IERC20 = artifacts.require('IERC20');

const WBTCEBTCLPToken_EBSPool = artifacts.require('WBTCEBTCLPTokenSharePool');
const WBTCEBSLPToken_EBSPool = artifacts.require('WBTCEBSLPTokenSharePool');

const UniswapV2Factory = artifacts.require('UniswapV2Factory');

module.exports = async (deployer, network, accounts) => {
  const uniswapFactory =
    network === 'development'
      ? await UniswapV2Factory.deployed()
      : await UniswapV2Factory.at(knownContracts.UniswapV2Factory[network]);
  const wbtc =
    network === 'mainnet'
      ? await IERC20.at(knownContracts.WBTC[network])
      : await MockWBTC.deployed();

  const deployments = readAddresses(network);
  const oracle = await Oracle.at(deployments.seigniorageOracle);

  const wbtc_bac_lpt = await oracle.pairFor(
    uniswapFactory.address,
    Cash.address,
    wbtc.address
  );
  const wbtc_bas_lpt = await oracle.pairFor(
    uniswapFactory.address,
    Share.address,
    wbtc.address
  );

  const EBSPool1 = await deployer.deploy(
    WBTCEBTCLPToken_EBSPool,
    Share.address,
    wbtc_bac_lpt,
    POOL_START_DATE
  );
  const EBSPool2 = await deployer.deploy(
    WBTCEBSLPToken_EBSPool,
    Share.address,
    wbtc_bas_lpt,
    POOL_START_DATE
  );

  const lpPools = {
    WBTCEBTCLP_EBSPool: EBSPool1.address,
    WBTCEBSLP_EBSPool: EBSPool2.address,
  };

  const addresses = readAddresses(network);
  console.log('Update deployed addresses with lp pools ...');
  addresses.lpPools = lpPools;
  await writeAddresses(addresses, network);
};
