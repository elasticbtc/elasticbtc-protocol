pragma solidity ^0.6.0;

import '@openzeppelin/contracts/math/SafeMath.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';

import '../interfaces/IDistributor.sol';
import '../interfaces/IRewardDistributionRecipient.sol';

contract InitialShareDistributor is IDistributor {
    using SafeMath for uint256;

    event Distributed(address pool, uint256 cashAmount);

    bool public once = true;

    IERC20 public share;
    IRewardDistributionRecipient public wBTCeBTCLPPool;
    uint256 public wBTCeBTCInitialBalance;
    IRewardDistributionRecipient public wBTCEBSLPPool;
    uint256 public wBTCEBSInitialBalance;

    constructor(
        IERC20 _share,
        IRewardDistributionRecipient _wBTCeBTCLPPool,
        uint256 _wBTCeBTCInitialBalance,
        IRewardDistributionRecipient _wBTCEBSLPPool,
        uint256 _wBTCEBSInitialBalance
    ) public {
        share = _share;
        wBTCeBTCLPPool = _wBTCeBTCLPPool;
        wBTCeBTCInitialBalance = _wBTCeBTCInitialBalance;
        wBTCEBSLPPool = _wBTCEBSLPPool;
        wBTCEBSInitialBalance = _wBTCEBSInitialBalance;
    }

    function distribute() public override {
        require(
            once,
            'InitialShareDistributor: you cannot run this function twice'
        );

        share.transfer(address(wBTCeBTCLPPool), wBTCeBTCInitialBalance);
        wBTCeBTCLPPool.notifyRewardAmount(wBTCeBTCInitialBalance);
        emit Distributed(address(wBTCeBTCLPPool), wBTCeBTCInitialBalance);

        share.transfer(address(wBTCEBSLPPool), wBTCEBSInitialBalance);
        wBTCEBSLPPool.notifyRewardAmount(wBTCEBSInitialBalance);
        emit Distributed(address(wBTCEBSLPPool), wBTCEBSInitialBalance);

        once = false;
    }
}
