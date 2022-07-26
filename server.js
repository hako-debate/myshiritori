import { serve } from "https://deno.land/std@0.138.0/http/server.ts";
import { serveDir } from "https://deno.land/std@0.138.0/http/file_server.ts";

class Room{
    constructor(number) {
        this.number = number;
        this.users = [];
        this.activate = false;
        this.wordlog = [];
        this.userlog = [];
    }

    get roomjson() {
        return this.getjson();
    }

    getjson() {
        let jsonData = {
            number: this.number,
            users: this.users,
            activate: this.activate,
            wordlog: this.wordlog,
            userlog: this.userlog,
        };
        return JSON.stringify(jsonData);
    }
}


const text = await Deno.readTextFile("./public/words.json")
const words = JSON.parse(text).words

function getRandomIntInclusive(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1) + min);
}

const index = getRandomIntInclusive(0, words.length)

//let previousWord = "しりとり";
// 外部辞書(json)からランダムに初期語を決定（http://compling.hss.ntu.edu.sg/wnja/index.ja.htmlのxmlより単語を抜粋）
let previousWord = words[index];

console.log("Listening on http://localhost:8000");

let roomsArray = [];


serve(async (req) => {
    const pathname = new URL(req.url).pathname;
    if (req.method === "GET" && pathname === "/shiritori") {
        return new Response(previousWord);
    }
    if (req.method === "GET" && pathname === "/roominfo") {
        let temp = [];
        for (let j = 0; j < roomsArray.length; j++) {
            temp.push(roomsArray[j].roomjson);
        }
        return new Response(temp.join('|'));
    }
    if (req.method === "POST" && pathname === "/reset") {
        const requestJson = await req.json();
        const number = requestJson.number;
        for (let i = 0; i <= roomsArray.length - 1; ++i) {
            if (roomsArray[i].number == number) {
                roomsArray[i] = new Room();
            }
        }
        return new Response("reset");
    }
    if (req.method === "POST" && pathname === "/shiritori") {
        const requestJson = await req.json();
        if (typeof requestJson.nextWord == "string") {
            const nextWord = requestJson.nextWord;
            const user = requestJson.name;
            const number = requestJson.number;
            if (nextWord.length > 0 && previousWord.charAt(previousWord.length - 1) !== nextWord.charAt(0)) {
                return new Response("前の単語に続いていません．", { status: 400 });
            }
            for (let i = 0; i <= roomsArray.length - 1; ++i) {
                if (roomsArray[i].number == number) {
                    if (roomsArray[i].wordlog.includes(nextWord)) {
                        return new Response("既出の単語です．", { status: 400 });
                    }
                }
            }
            if (!nextWord.match(/^[ぁ-んー　]*$/)) {
                return new Response("ひらがなを入力してください．", { status: 400 });
            }

            // log更新
            for (let i = 0; i <= roomsArray.length - 1; ++i) {
                if (roomsArray[i].number == number) {
                    roomsArray[i].wordlog.push(nextWord);
                    roomsArray[i].userlog.push(user);
                }
            }

            previousWord = nextWord;
            return new Response(previousWord);
        }
        else {
            let key = true;
            const name = requestJson.name;
            const number = requestJson.number;

            for (let i = 0; i <= roomsArray.length - 1; ++i) {
                if (roomsArray[i].number == number) {
                    if (roomsArray[i].users.includes(name)) {
                        return new Response("既に登録済みのルーム，名前です．", { status: 409 });
                    }
                }
            }
            // Rooms更新
            for (let i = 0; i <= roomsArray.length - 1; ++i) {
                if (roomsArray[i].number == number) {
                    roomsArray[i].users.push(name);
                    if (!roomsArray[i].wordlog.includes(previousWord)) {
                        roomsArray[i].wordlog.push(previousWord);
                    }
                    key = false;
                }
            }
            if (key) {
                const new_room = new Room(number);
                new_room.users.push(name);
                new_room.wordlog.push(previousWord);
                new_room.userlog.push("Start　");
                roomsArray.push(new_room);
            }

            return new Response(`ようこそ ${name} さん\nルーム${number}で対戦を開始します．`, { status: 400 });
        }
}


    return serveDir(req, {
        fsRoot: "public",
        urlRoot: "",
        showDirListing: true,
        enableCors: true,
    });
});

// deno run --allow-net --allow-read server.js