/* eslint-disable react/jsx-key */
import { Button } from "frames.js/next";
import { frames } from "./frames";
import { Abi, createPublicClient, http } from 'viem';
import { mainnet } from 'viem/chains';
import names from '../names.json';
import { getTransaction } from "viem/actions";

const client = createPublicClient({
    chain: mainnet,
    transport: http(),
});

const handleRequest = frames(async (ctx) => {

    const currentState = ctx.state;

    // Update the state
    let updatedState = {
        ...currentState,
        counter: currentState.counter + 1
    };

    const abi: Abi = JSON.parse(process.env.ABI || '[]');
    const contract_address = process.env.CONTRACT || '';
    
    const totalMinted = await client.readContract({
        address: `0x${contract_address}`,
        abi: abi,
        functionName: 'totalSupply'
    })

    const checkIfIdIsMinted = async (index: string) => {
        return await client.readContract({
            address: `0x${contract_address}`,
            abi: abi,
            functionName: 'minted_ids',
            args: [index]
        })
    }

    const getName = async (i: number): Promise<string> => {
        const name: string | undefined = names[i.toString() as keyof typeof names]

        let available: boolean = name !== undefined
        available = available && (await checkIfIdIsMinted(i.toString()) as boolean == false);

        // if there's a name and it is not yet minted
        if (available) {
            // Update the state
            updatedState = {
                ...currentState,
                counter: i,
                name: name
            };
            return name;
        } else {
            let newCount = i + 1;
            return await getName(newCount);
        }
    }

    const fetchImageUrl = async (id: number) => {
        const ipfs_link: string = await client.readContract({
            address: `0x${contract_address}`,
            abi: abi,
            functionName: 'tokenURI',
            args: [id]
        }) as string
        // get the image value from the metadata resolved by the ipfs link
        const metadata = await fetch(ipfs_link.replace("ipfs://", "https://ipfs.io/ipfs/") as string);
        const json = await metadata.json();
        //console.log(json)
        return json.image.replace("ipfs://", "https://ipfs.io/ipfs/");
    }

    //const txId = '0xbeb86073e6ede684d19f35e7a0fe2df42335ab1fb4581580e8ed4bc6899e7446'
    if (ctx.message?.transactionId) {
        let receipt = null
        let decimalValue = 0
        try {
            receipt = await client.waitForTransactionReceipt({hash: ctx.message?.transactionId});
            const topicValue = receipt.logs[0].topics[3]?.toString() || '';
            decimalValue = parseInt(topicValue, 16);
        } catch (error) {
            // do nothing if an error occurs, user can click refresh to try again
        }
        
        return {
            image: !receipt ? (
                await fetchImageUrl(decimalValue)
            ) : (
                <div tw="p-5 bg-purple-800 text-white w-full h-full justify-center items-center flex">
                    transaction submitted, click refresh to check the status
                </div>
            ),
            imageOptions: {
                aspectRatio: "1:1",
            },
            buttons: [
                <Button
                    action="link"
                    target={`https://etherscan.io/tx/${ctx.message?.transactionId}`}
                >
                    view on block explorer
                </Button>,
                <Button
                    action="post"
                >
                    refresh
                </Button>
            ],
        }
    }

    return {
        image: (
            <div tw="flex flex-col">
                <h4>366 names</h4>
                <h1>{totalMinted as string}/366 minted</h1>
                <div tw="flex flex-col">
                    {ctx.pressedButton
                        ? `Mint ${await getName(ctx.state.counter + 1)}`
                        : `Choose a name`}
                </div>
            </div>
        ),
        buttons: updatedState.name !== '' ? ([
            <Button action="post">
                random name
            </Button>,
            <Button action="tx" target="/txdata" post_url="/">
                {`Mint ${updatedState.name}`}
            </Button>]) : ([
                <Button action="post">
                    random name
                </Button>]),
        state: updatedState
    };
});

export const GET = handleRequest;
export const POST = handleRequest;