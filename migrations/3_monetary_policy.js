const { POOL_START_DATE } = require('./pools');
const knownContracts = require('./known-contracts');
const { writeAddresses } = require('./util');

const IERC20 = artifacts.require('IERC20');
const Cash = artifacts.require('Cash');
const Bond = artifacts.require('Bond');
const Share = artifacts.require('Share');
const MockWBTC = artifacts.require('MockWBTC');

const SimpleERCFund = artifacts.require('SimpleERCFund');
const Oracle = artifacts.require('Oracle');
const Boardroom = artifacts.require('Boardroom');
const Treasury = artifacts.require('Treasury');

const UniswapV2Factory = artifacts.require('UniswapV2Factory');
const UniswapV2Router02 = artifacts.require('UniswapV2Router02');

const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 86400;

const TEN_THOUNSAND = 10000;

async function migration(deployer, network, accounts) {
  let uniswap, uniswapRouter;
  if (network === 'development') {
    console.log('Deploying uniswap on dev network.');
    await deployer.deploy(UniswapV2Factory, accounts[0]);
    uniswap = await UniswapV2Factory.deployed();

    await deployer.deploy(UniswapV2Router02, uniswap.address, accounts[0]);
    uniswapRouter = await UniswapV2Router02.deployed();
  } else {
    uniswap = await UniswapV2Factory.at(
      knownContracts.UniswapV2Factory[network]
    );
    uniswapRouter = await UniswapV2Router02.at(
      knownContracts.UniswapV2Router02[network]
    );
  }

  const wbtc =
    network === 'mainnet'
      ? await IERC20.at(knownContracts.WBTC[network])
      : await MockWBTC.deployed();

  // 2. provide liquidity to BAC-DAI and BAS-DAI pair
  // if you don't provide liquidity to BAC-DAI and BAS-DAI pair after step 1 and before step 3,
  //  creating Oracle will fail with NO_RESERVES error.
  const wbtcUnit = web3.utils
    .toBN(10 ** 8 / TEN_THOUNSAND)
    .toString();
  const unit = web3.utils
    .toBN(10 ** 18 / TEN_THOUNSAND)
    .toString();
  const max = web3.utils
    .toBN(10 ** 18)
    .muln(10000)
    .toString();

  const cash = await Cash.deployed();
  const bond = await Bond.deployed();
  const share = await Share.deployed();

  console.log('Approving Uniswap on tokens for liquidity');
  await Promise.all([
    approveIfNot(cash, accounts[0], uniswapRouter.address, max),
    approveIfNot(share, accounts[0], uniswapRouter.address, max),
    approveIfNot(wbtc, accounts[0], uniswapRouter.address, max),
  ]);

  // WARNING: msg.sender must hold enough DAI to add liquidity to BAC-DAI & BAS-DAI pools
  // otherwise transaction will revert
  console.log('Adding liquidity to pools');
  await uniswapRouter.addLiquidity(
    cash.address,
    wbtc.address,
    unit,
    wbtcUnit,
    unit,
    wbtcUnit,
    accounts[0],
    deadline()
  );
  await uniswapRouter.addLiquidity(
    share.address,
    wbtc.address,
    unit,
    wbtcUnit,
    unit,
    wbtcUnit,
    accounts[0],
    deadline()
  );

  const wBTCEBTCLP = await uniswap.getPair(wbtc.address, cash.address);
  const wBTCEBSLP = await uniswap.getPair(wbtc.address, share.address);
  console.log(`WBTC-EBTC pair address: ${wBTCEBTCLP}`);
  console.log(`WBTC-EBS pair address: ${wBTCEBSLP}`);

  // Deploy boardroom
  await deployer.deploy(Boardroom, cash.address, share.address);

  // 2. Deploy oracle for the pair between ebtc and wbtc
  const seigniorageOracle = await deployer.deploy(
    Oracle,
    uniswap.address,
    cash.address,
    wbtc.address,
    DAY,
    POOL_START_DATE
  );

  // 3. Deploy bond oracle
  const bondOracle = await Oracle.new(
    uniswap.address,
    cash.address,
    wbtc.address,
    HOUR,
    POOL_START_DATE
  );

  let startTime = POOL_START_DATE;
  if (network === 'mainnet') {
    startTime += 5 * DAY;
  }

  const communityFund = await SimpleERCFund.new();
  const devFund = await SimpleERCFund.new();

  await deployer.deploy(
    Treasury,
    cash.address,
    bond.address,
    share.address,
    bondOracle.address,
    seigniorageOracle.address,
    Boardroom.address,
    communityFund.address,
    devFund.address,
    startTime
  );

  const deployedContracts = {
    cash: cash.address,
    bond: bond.address,
    share: share.address,
    bondOracle: bondOracle.address,
    seigniorageOracle: seigniorageOracle.address,
    boardroom: Boardroom.address,
    treasury: Treasury.address,
    communityFund: communityFund.address,
    devFund: devFund.address,
    uniswapV2lpTokens: {
      WBTCEBTCLP: wBTCEBTCLP,
      WBTCEBSLP: wBTCEBSLP,
    },
  };

  if (network === 'development') {
    deployedContracts.uniswapV2Factory = uniswap.address;
    deployedContracts.uniswapV2Router = uniswapRouter.address;
  }

  console.log('Writing deployments to file ...');
  await writeAddresses(deployedContracts, network);
}

async function approveIfNot(token, owner, spender, amount) {
  const allowance = await token.allowance(owner, spender);
  if (web3.utils.toBN(allowance).gte(web3.utils.toBN(amount))) {
    return;
  }
  await token.approve(spender, amount);
  console.log(
    ` - Approved ${token.symbol ? await token.symbol() : token.address}`
  );
}

function deadline() {
  // 30 minutes
  return Math.floor(new Date().getTime() / 1000) + 1800;
}

module.exports = migration;
