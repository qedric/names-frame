/* eslint-disable react/jsx-key */
import { Button } from "frames.js/next";
import { frames } from "./frames";
import { createPublicClient, http } from 'viem';
import { mainnet } from 'viem/chains';
import names from '../data/names.json';
import data from '../data/data.json';
import abi from '../data/abi.json';

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
    
    const contract_address = data.contract
    const totalMinted = await client.readContract({
        address: `0x${contract_address}`,
        abi: abi,
        functionName: 'totalSupply'
    })

    const alreadyMinted = async (index: string) => {
        return await client.readContract({
            address: `0x${contract_address}`,
            abi: abi,
            functionName: 'minted_ids',
            args: [index]
        })
    }

    // return an available name and id, if a match is found and it is available to mint
    const getName = async (n: string): Promise<string> => {

        const nameRecord = names.find(record => record.name.toLowerCase().trim() == n.toLowerCase().trim());

        console.log(nameRecord)

        if (nameRecord) {
            if (!await alreadyMinted(nameRecord.id)) {
                // Update the state
                updatedState = {
                    ...currentState,
                    counter: parseInt(nameRecord.id),
                    name: nameRecord.name
                };
                return `mint ${nameRecord.name}`;
            }
        }
        return `${n} isn't available -- try another or hit the button for a random name`;
    }

    // return the next available name and id
    const getNextName = async (i: number): Promise<string> => {

        // if we reach the end of the list just begin again
        if (i > 366) {
            i = 1
        }

        const nameRecord = names.find(record => record.id === i.toString());

        if (nameRecord) {
            if (!await alreadyMinted(nameRecord.id)) {
                // Update the state
                updatedState = {
                    ...currentState,
                    counter: parseInt(nameRecord?.id || ''),
                    name: nameRecord.name
                };
                return `mint ${nameRecord.name}`;
            }
        }

        let newCount = i + 1;
        return await getNextName(newCount);
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
            //receipt = await client.waitForTransactionReceipt({hash: txId});
            receipt = await client.waitForTransactionReceipt({hash: ctx.message?.transactionId});
            const topicValue = receipt.logs[0].topics[3]?.toString() || '';
            decimalValue = parseInt(topicValue, 16);
        } catch (error) {
            // do nothing if an error occurs, user can click refresh to try again
        }
        
        return {
            image: receipt ? (
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
            <div tw="bg-rose-200 flex justify-center items-center w-full h-full">
                <div tw="p-6 bg-purple-900 text-white w-3/4 h-3/4 justify-center items-center flex flex-col">
                    <h1 tw="mb-0">3 6 6 N A M E S</h1>
                    <h4 tw="mt-2 text-center">{data.p1}</h4>
                    <h2>{totalMinted as string}/366 minted</h2>
                    <div tw="flex flex-col bg-rose-200 text-purple-900 px-12 py-2 rounded-full">
                        {ctx.pressedButton
                            ? ctx.message?.inputText
                                ? `${await getName(ctx.message.inputText)}`
                                : `${await getNextName(ctx.state.counter + 1)}`
                            : `choose name`}
                    </div>
                </div>
            </div>
        ),
        imageOptions: {
            aspectRatio: "1:1",
        },
        buttons: updatedState.name !== '' ? ([
            <Button action="post">
                choose name
            </Button>,
            <Button action="tx" target="/txdata" post_url="/">
                {`mint ${updatedState.name}`}
            </Button>,
            <Button action="link" target="https://opensea.io/collection/366names">
                view on opensea
            </Button>
            ]) : ([
            <Button action="post">
                choose name
            </Button>,
            <Button action="link" target="https://opensea.io/collection/366names">
                view on opensea
            </Button>]),
        textInput: "enter a name",
        state: updatedState
    };
});

export const GET = handleRequest;
export const POST = handleRequest;