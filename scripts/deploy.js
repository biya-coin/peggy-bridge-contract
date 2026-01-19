const { ethers, upgrades, run } = require("hardhat");

async function main() {
    require('dotenv').config();  // 加载 .env 文件

    const peggyIdHex = process.env.PEGGY_ID;
    if (!peggyIdHex) {
        throw new Error("Missing PEGGY_ID in .env file");
    }
    // const peggyId = ethers.utils.formatBytes32String(peggyIdHex);
    const peggyId = ethers.encodeBytes32String(peggyIdHex);
    console.log("Peggy ID (hex):", peggyId);

    // var peggyId = ethers.hexlify(
    //     ethers.zeroPadValue(ethers.toUtf8Bytes("injective-peggyid"), 32)
    // );

    const powerThresholdStr = process.env.POWER_THRESHOLD;
    if (!powerThresholdStr) {
        throw new Error("Missing POWER_THRESHOLD in .env file");
    }
    const powerThreshold = parseInt(powerThresholdStr, 10);

    const validatorsStr = process.env.VALIDATORS || '';
    // if (!validatorsStr) {
    //     throw new Error("Missing VALIDATORS in .env file");
    // }
    const validators = validatorsStr.split(',').map(v => v.trim()).filter(v => v);  // 分割并清理空项

    const powersStr = process.env.POWERS || '';
    // if (!powersStr) {
    //     throw new Error("Missing POWERS in .env file");
    // }
    const powers = powersStr.split(',').map(p => parseInt(p.trim(), 10)).filter(p => !isNaN(p));  // 分割、解析数字并过滤无效项

    // 验证参数（可选，但推荐）
    if (validators.length !== powers.length) {
        throw new Error("Validators 和 Powers 长度必须匹配");
    }
    let cumulativePower = 0;
    for (let i = 0; i < powers.length; i++) {
        cumulativePower += powers[i];
        if (cumulativePower > powerThreshold) break;
    }
    if (cumulativePower <= powerThreshold) {
        throw new Error("总权力必须大于阈值");
    }

    console.log("使用参数：");
    console.log("- Peggy ID:", ethers.hexlify(peggyId));  // 使用 hexlify（Ethers v6）
    console.log("- Power Threshold:", powerThreshold);
    console.log("- Validators:", validators);
    console.log("- Powers:", powers);

    // peggyId = `0x696e6a6563746976652d70656767796964000000000000000000000000000000`;

    // 获取合约工厂
    const Peggy = await ethers.getContractFactory("Peggy");

    // 部署透明代理（使用 unsafeAllow 数组格式兼容旧版合约）
    console.log("开始部署 Peggy 透明代理...");
    const proxy = await upgrades.deployProxy(
        Peggy,
        [peggyId, powerThreshold, validators, powers],  // initialize 函数的参数
        {
            kind: 'transparent',  // 指定透明代理模式
            initializer: 'initialize',  // 明确指定初始化函数
            unsafeAllow: [
                'constructor',  // 允许非升级继承（如 Pausable），因为合约无构造函数
                'incorrect-initializer-order'  // 绕过初始化顺序检查（兼容 0.8.0 风格）
            ],
        }
    );

    // 等待部署完成
    await proxy.waitForDeployment();

    const proxyAddress = await proxy.getAddress();
    console.log("Peggy 代理合约已部署到地址:", proxyAddress);

    // 可选：验证部署
    const peggy = await ethers.getContractAt("Peggy", proxyAddress);
    console.log("Peggy ID:", ethers.hexlify(await peggy.state_peggyId()));  // 使用 hexlify
    console.log("Power Threshold:", await peggy.state_powerThreshold());

    // 保存部署信息（可选）
    const implementationAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);
    console.log("实现合约地址:", implementationAddress);

    // 新增：开源验证到 Etherscan（带错误处理）
    console.log("\n开始开源验证合约到 Etherscan...");
    try {
        // 验证实现合约（核心开源部分）
        await run("verify:verify", {
            address: implementationAddress,
            constructorArguments: [],  // 实现合约无参数
            contract: "contracts/Peggy.sol:Peggy",  // 指定合约文件:合约名
        });

        // 验证代理合约（可选，显示代理结构；简化参数以兼容 v6）
        const adminAddress = await upgrades.erc1967.getAdminAddress(proxyAddress);
        const initializerData = ethers.AbiCoder.defaultAbiCoder().encode(
            ["bytes"],
            [ethers.AbiCoder.defaultAbiCoder().encode(["address"], [implementationAddress])]
        );
        await run("verify:verify", {
            address: proxyAddress,
            constructorArguments: [
                implementationAddress,  // 代理的逻辑合约地址
                adminAddress,  // 代理的管理员地址
                initializerData,  // 初始化数据（指向实现）
            ],
            contract: "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol:TransparentUpgradeableProxy",
        });

        console.log("开源验证完成！");
    } catch (verifyError) {
        console.warn("Etherscan 验证失败（可能因网络延迟或 API 问题）:", verifyError.message);
        console.log("可手动在 https://sepolia.etherscan.io/ 验证地址:", proxyAddress);
    }

    console.log("查看 Etherscan: https://sepolia.etherscan.io/address/" + proxyAddress);
    console.log("\n部署完成！代理地址:", proxyAddress);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });