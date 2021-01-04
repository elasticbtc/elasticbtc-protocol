import { Provider } from '@ethersproject/providers';
import { expect } from 'chai';
import { network, ethers } from 'hardhat';
import { advanceTimeAndBlock } from '../test/shared/utilities';
import { deadline, wait } from './utils';

const MINUTE = 60;
const HOUR = 60 * MINUTE;
const ZERO = ethers.BigNumber.from(0);
const ONE_WBTC = ethers.BigNumber.from('100000000'); // 10 ** 8
const KnownAddresses = require('../migrations/known-contracts.js');

async function latestBlocktime(provider: Provider): Promise<number> {
  const { timestamp } = await provider.getBlock('latest');
  return timestamp;
}

async function main() {
  if (network.name === 'mainnet') {
    throw new Error('Cannot run simulation on mainnet');
  }

  if (network.name === 'localhost') {
    network.name = 'development';
  }

  const { provider } = ethers;
  const [operator] = await ethers.getSigners();

  const estimateGasPrice = await provider.getGasPrice();
  const gasPrice = estimateGasPrice.mul(3).div(2);
  console.log(`Gas Price: ${ethers.utils.formatUnits(gasPrice, 'gwei')} gwei`);
  const override = { gasPrice };

  const addresses = require(`../deployments/addresses.${network.name}.json`);
  const uniswapRouterAddress =
    addresses.uniswapV2Router || KnownAddresses.UniswapV2Router02[network.name];

  const uniswapRouter = await ethers.getContractAt(
    'UniswapV2Router02',
    uniswapRouterAddress
  );
  const wbtc = await ethers.getContractAt('MockWBTC', addresses.wbtc);
  const ebtc = await ethers.getContractAt('Cash', addresses.cash);
  const ebs = await ethers.getContractAt('Share', addresses.share);
  const ebb = await ethers.getContractAt('Bond', addresses.bond);
  const oracle = await ethers.getContractAt('Oracle', addresses.bondOracle);
  const boardroom = await ethers.getContractAt(
    'Boardroom',
    addresses.boardroom
  );
  const treasury = await ethers.getContractAt('Treasury', addresses.treasury);

  let tx;

  const ebtcSupply = await ebtc.totalSupply();
  console.log('EBTC Supply: ', ebtcSupply.toString());
  console.log(
    'Accumulated Seigniorage: ',
    (await treasury.getReserve()).toString()
  );

  console.log('\n===== Buy tokens on uniswap =====');
  console.log('Buy 0.0001 WBTC worth of EBTC ...');
  tx = await uniswapRouter.connect(operator).swapExactTokensForTokens(
    ONE_WBTC.div('10000'),
    ZERO, // We don't care about slippage
    [wbtc.address, ebtc.address],
    operator.address,
    deadline()
  );
  await wait(ethers, tx.hash, 'uniswapRouter.swapExactTokensForTokens');

  console.log('Buy 1 WBTC worth of EBS ...');
  tx = await uniswapRouter.connect(operator).swapExactTokensForTokens(
    ONE_WBTC,
    ZERO, // We don't care about slippage
    [wbtc.address, ebs.address],
    operator.address,
    deadline()
  );
  await wait(ethers, tx.hash, 'uniswapRouter.swapExactTokensForTokens');

  console.log('\n===== Stake EBS =====');
  const ebsBalance = await ebs.balanceOf(operator.address);
  await ebs.approve(boardroom.address, ebsBalance);
  tx = await boardroom.connect(operator).stake(ebsBalance);
  await wait(ethers, tx.hash, 'boardroom.stake');
  console.log(`Staked ${ebsBalance.toString()} EBS in boardroom`);

  console.log(
    `\n===== Calling allocateSeigniorage on treasury at ${addresses.treasury} =====`
  );
  try {
    tx = await treasury.connect(operator).allocateSeigniorage(override);
    await wait(ethers, tx.hash, 'treasury.allocateSeigniorage');
  } catch (e) {
    throw new Error(`Failed to allocate seigniorage. Error: ${e}`);
  }

  console.log('\n===== Claim EBTC =====');
  tx = await boardroom.connect(operator).claimReward();
  await wait(ethers, tx.hash, 'boardroom.claimReward');
  let ebtcBalance = await ebtc.balanceOf(operator.address);
  console.log(`${ebtcBalance} claimed`);

  let twap = await treasury.getBondOraclePrice();
  console.log(`Current EBTC TWAP: ${twap}`);

  console.log('\n===== Sell EBTC on Uniswap =====');
  await ebtc.approve(uniswapRouter.address, ebtcBalance);
  console.log('Sell 9/10 of EBTC holdings ...');
  tx = await uniswapRouter.connect(operator).swapExactTokensForTokens(
    ebtcBalance.mul(9).div(10),
    ZERO, // We don't care about slippage
    [ebtc.address, wbtc.address],
    operator.address,
    deadline()
  );
  await wait(ethers, tx.hash, 'uniswapRouter.swapExactTokensForTokens');

  console.log('\n===== Update Oracle =====');
  tx = await oracle.connect(operator).update();
  await wait(ethers, tx.hash, 'oracle.update');
  tx = await oracle.connect(operator).update();
  await wait(ethers, tx.hash, 'oracle.update');
  tx = await oracle.connect(operator).update();
  await wait(ethers, tx.hash, 'oracle.update');
  tx = await oracle.connect(operator).update();
  await wait(ethers, tx.hash, 'oracle.update');
  tx = await oracle.connect(operator).update();
  await wait(ethers, tx.hash, 'oracle.update');
  tx = await oracle.connect(operator).update();
  await wait(ethers, tx.hash, 'oracle.update');
  tx = await oracle.connect(operator).update();
  await wait(ethers, tx.hash, 'oracle.update');
  tx = await oracle.connect(operator).update();
  await wait(ethers, tx.hash, 'oracle.update');
  tx = await oracle.connect(operator).update();
  await wait(ethers, tx.hash, 'oracle.update');
  tx = await oracle.connect(operator).update();
  await wait(ethers, tx.hash, 'oracle.update');
  tx = await oracle.connect(operator).update();
  await wait(ethers, tx.hash, 'oracle.update');
  twap = await treasury.getBondOraclePrice();
  console.log(`Updated EBTC TWAP: ${twap}`);

  if (twap.gte(ONE_WBTC)) {
    throw new Error('Cannot buy bonds');
  }

  ebtcBalance = await ebtc.balanceOf(operator.address);
  console.log('\nEBTC Balance: ', ebtcBalance.toString());

  const oldBondBalance = await ebb.balanceOf(operator.address);
  console.log(`\n===== Buy Bonds =====`);
  await ebtc.approve(treasury.address, ebtcBalance);
  await treasury.connect(operator).buyBonds(ebtcBalance, twap);
  const expectedBalanced = ebtcBalance.mul(ONE_WBTC).div(twap);
  const bondBalance = (await ebb.balanceOf(operator.address)).sub(
    oldBondBalance
  );
  console.log('Bonds bought: ', bondBalance.toString());
  console.log('Expected: ', expectedBalanced.toString());
  expect(bondBalance.toString()).to.eq(expectedBalanced.toString());

  console.log('\n===== Buy EBTC on Uniswap =====');
  console.log('Buy 1 WBTC worth of EBTC on Uniswap');
  tx = await uniswapRouter.connect(operator).swapExactTokensForTokens(
    ONE_WBTC,
    ZERO, // We don't care about slippage
    [wbtc.address, ebtc.address],
    operator.address,
    deadline()
  );
  await wait(ethers, tx.hash, 'uniswapRouter.swapExactTokensForTokens');

  console.log('\n===== Update Oracle =====');
  tx = await oracle.connect(operator).update();
  await wait(ethers, tx.hash, 'oracle.update');
  tx = await oracle.connect(operator).update();
  await wait(ethers, tx.hash, 'oracle.update');
  tx = await oracle.connect(operator).update();
  await wait(ethers, tx.hash, 'oracle.update');
  tx = await oracle.connect(operator).update();
  await wait(ethers, tx.hash, 'oracle.update');
  tx = await oracle.connect(operator).update();
  await wait(ethers, tx.hash, 'oracle.update');
  tx = await oracle.connect(operator).update();
  await wait(ethers, tx.hash, 'oracle.update');
  tx = await oracle.connect(operator).update();
  await wait(ethers, tx.hash, 'oracle.update');
  tx = await oracle.connect(operator).update();
  await wait(ethers, tx.hash, 'oracle.update');
  tx = await oracle.connect(operator).update();
  await wait(ethers, tx.hash, 'oracle.update');
  tx = await oracle.connect(operator).update();
  await wait(ethers, tx.hash, 'oracle.update');
  tx = await oracle.connect(operator).update();
  await wait(ethers, tx.hash, 'oracle.update');
  twap = await treasury.getBondOraclePrice();
  console.log(`Updated EBTC TWAP: ${twap}`);

  console.log(
    `\n===== Calling allocateSeigniorage on treasury at ${addresses.treasury} =====`
  );
  try {
    tx = await treasury.connect(operator).allocateSeigniorage(override);
    await wait(ethers, tx.hash, 'treasury.allocateSeigniorage');
  } catch (e) {
    throw new Error(`Failed to allocate seigniorage. Error: ${e}`);
  }

  twap = await treasury.getBondOraclePrice();
  console.log(`Updated EBTC TWAP: ${twap}`);

  console.log('\n===== Redeem Bonds =====');
  ebtcBalance = await ebtc.balanceOf(operator.address);
  await ebb.approve(treasury.address, bondBalance);
  tx = await treasury.connect(operator).redeemBonds(bondBalance, twap);
  const redeemedBalance = (await ebtc.balanceOf(operator.address)).sub(
    ebtcBalance
  );
  expect(bondBalance.toString()).to.eq(redeemedBalance.toString());
  console.log('EBTC redeemed: ', redeemedBalance.toString());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
