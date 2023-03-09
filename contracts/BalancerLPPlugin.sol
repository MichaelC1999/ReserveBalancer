pragma solidity ^0.8.0;
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";


 interface IERC20Metadata is IERC20 {
    /**
     * @dev Returns the name of the token.
     */
    function name() external view returns (string memory);

    /**
     * @dev Returns the symbol of the token.
     */
    function symbol() external view returns (string memory);

    /**
     * @dev Returns the decimals places of the token.
     */
    function decimals() external view returns (uint8);
}

 interface IRewardable {
  /// Emitted whenever a reward token balance is claimed
  event RewardsClaimed(IERC20 indexed erc20, uint256 indexed amount);

  /// Claim rewards earned by holding a balance of the ERC20 token
  /// Must emit `RewardsClaimed` for each token rewards are claimed for
  /// @dev delegatecall: there be dragons here!
  /// @custom:interaction
  function claimRewards() external;
}

/**
 * @title IAsset
 * @notice Supertype. Any token that interacts with our system must be wrapped in an asset,
 * whether it is used as RToken backing or not. Any token that can report a price in the UoA
 * is eligible to be an asset.
 */
interface IAsset is IRewardable {
  /// Refresh saved price
  /// The Reserve protocol calls this at least once per transaction, before relying on
  /// the Asset's other functions.
  /// @dev Called immediately after deployment, before use
  function refresh() external;

  /// Should not revert
  /// @return low {UoA/tok} The lower end of the price estimate
  /// @return high {UoA/tok} The upper end of the price estimate
  function price() external view returns (uint192 low, uint192 high);

  /// Should not revert
  /// lotLow should be nonzero when the asset might be worth selling
  /// @return lotLow {UoA/tok} The lower end of the lot price estimate
  /// @return lotHigh {UoA/tok} The upper end of the lot price estimate
  function lotPrice() external view returns (uint192 lotLow, uint192 lotHigh);

  /// @return {tok} The balance of the ERC20 in whole tokens
  function bal(address account) external view returns (uint192);

  /// @return The ERC20 contract of the token with decimals() available
  function erc20() external view returns (IERC20Metadata);

  /// @return The number of decimals in the ERC20; just for gas optimization
  function erc20Decimals() external view returns (uint8);

  /// @return If the asset is an instance of ICollateral or not
  function isCollateral() external view returns (bool);

  /// @param {UoA} The max trade volume, in UoA
  function maxTradeVolume() external view returns (uint192);
}

/// CollateralStatus must obey a linear ordering. That is:
/// - being DISABLED is worse than being IFFY, or SOUND
/// - being IFFY is worse than being SOUND.
enum CollateralStatus {
  SOUND,
  IFFY, // When a peg is not holding or a chainlink feed is stale
  DISABLED // When the collateral has completely defaulted
}

/**
 * @title ICollateral
 * @notice A subtype of Asset that consists of the tokens eligible to back the RToken.
 */
interface ICollateral is IAsset {
  /// Emitted whenever the collateral status is changed
  /// @param newStatus The old CollateralStatus
  /// @param newStatus The updated CollateralStatus
  event CollateralStatusChanged(
    CollateralStatus indexed oldStatus,
    CollateralStatus indexed newStatus
  );

  /// @dev refresh()
  /// Refresh exchange rates and update default status.
  /// VERY IMPORTANT: In any valid implemntation, status() MUST become DISABLED in refresh() if
  /// refPerTok() has ever decreased since last call.

  /// @return The canonical name of this collateral's target unit.
  function targetName() external view returns (bytes32);

  /// @return The status of this collateral asset. (Is it defaulting? Might it soon?)
  function status() external view returns (CollateralStatus);

  // ==== Exchange Rates ====

  /// @return {ref/tok} Quantity of whole reference units per whole collateral tokens
  function refPerTok() external view returns (uint192);

  /// @return {target/ref} Quantity of whole target units per whole reference unit in the peg
  function targetPerRef() external view returns (uint192);
}

struct CollateralConfig {
    uint48 priceTimeout; // {s} The number of seconds over which saved prices decay
    AggregatorV3Interface chainlinkFeed; // Feed units: {target/ref}
    uint192 oracleError; // {1} The % the oracle feed can be off by
    IERC20Metadata erc20; // The ERC20 of the collateral token
    uint192 maxTradeVolume; // {UoA} The max trade volume, in UoA
    uint48 oracleTimeout; // {s} The number of seconds until a oracle value becomes invalid
    bytes32 targetName; // The bytes32 representation of the target name
    uint192 defaultThreshold; // {1} A value like 0.05 that represents a deviation tolerance
    // set defaultThreshold to zero to create SelfReferentialCollateral
    uint48 delayUntilDefault; // {s} The number of seconds an oracle can mulfunction
    address BalancerPool;
}

contract BalancerLPPlugin {
    uint48 private defaultTimestamp = 0;
    address LPTokenAddress;
    uint48 public immutable delayUntilDefault; // {s} e.g 86400
    bytes32 public immutable targetName;

    //uint192 public immutable pegBottom; // {target/ref} The bottom of the peg

    //uint192 public immutable pegTop;
    constructor(CollateralConfig memory config) {
        LPTokenAddress = config.BalancerPool;
        require(config.targetName != bytes32(0), "targetName missing");
        if (config.defaultThreshold > 0) {
            require(config.delayUntilDefault > 0, "delayUntilDefault zero");
        }
        require(config.delayUntilDefault <= 1209600, "delayUntilDefault too long");

        targetName = config.targetName;
        delayUntilDefault = config.delayUntilDefault;

        // Cache constants
        // uint192 peg = targetPerRef(); // {target/ref}

        // {target/ref}= {target/ref} * {1}
        // uint192 delta = peg.mul(config.defaultThreshold);
        // pegBottom = peg - delta;
        // pegTop = peg + delta;
    }
    
    function poolAddress() external view returns (address) {
        return LPTokenAddress;
    }

    function isCollateral() external view returns (bool) {
        return true;
    }

    function status() external view returns (CollateralStatus) {
        if (defaultTimestamp == 0) {
            return CollateralStatus.SOUND;
        } else if (defaultTimestamp > block.timestamp) {
            // If the timestamp of estimated default defaultTimestamp is later than current timestamp
            return CollateralStatus.IFFY;
        } else {
            // If the timestamp of default is equal to or later than current timestamp
            return CollateralStatus.DISABLED;
        }
    }
}
// 0x5c6ee304399dbdb9c8ef030ab642b10820db8f56