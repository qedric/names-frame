import { frames } from "../frames";
import { NextResponse } from "next/server";
import {
    createPublicClient,
    encodeFunctionData,
    getContract,
    http,
} from "viem";
import { mainnet } from "viem/chains";
import data from '../../data/data.json';
import abi from '../../data/abi.json';

export const POST = frames(async (ctx) => {
    if (!ctx.message) {
        throw new Error("No message");
    }

    const contract_address = data.contract

    // Do something with the user's connected address that will be executing the tx
    const calldata = encodeFunctionData({
        abi: abi,
        functionName: "mintSingleNFT",
        args: [BigInt(ctx.state.counter)],
    });

    console.log(calldata)

    const publicClient = createPublicClient({
        chain: mainnet,
        transport: http(),
    });

    const namesContract = getContract({
        address: `0x${contract_address}`,
        abi: abi,
        client: publicClient,
    });

    // get the current price of the NFT
    const unitPrice:number = await namesContract.read.price() as number;

    return NextResponse.json({
        chainId: "eip155:1", // ethereum Mainnet
        method: "eth_sendTransaction",
        params: {
            abi: abi,
            to: `0x${contract_address}`,
            data: calldata,
            value: unitPrice.toString(),
        },
    });

});