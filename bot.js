require('dotenv').config();

// Config file that has the private variables needed
const token = process.env.TOKEN;
const pjson = require('./package.json');
const ver = pjson.version;

// This is the custom parser to get the current time cycle on Cetus
let parser = require('./wfTimeParseNew');

// Node requires
let fs = require('fs');
let os = require('os');

// Initialize the Discord bot using discord.js
const Discord = require('discord.js');
const client = new Discord.Client();
const DAY = 0;
const NIGHT = 1;

let currentState = -1;

require('http').createServer().listen(3000);

client.login(token);

client.on('ready', () => {
    console.log(`Connected to Discord.\nLogged in as ${client.user.username} (${client.user.id})`);

    // Set a timer to check whether cycle changed and update bot accordingly
    setInterval(() => {
        updateBot();
    }, 60000);
});

client.on('message', async message => {
    let prefix = '~';
    // TODO: handle mentions and help messages
    // This event will run on every single message received, from any channel or DM

    // It's good practice to ignore other bots. This also makes your bot ignore itself
    if (message.author.bot) return;
    // Also good practice to ignore any message that does not start with the bot'ss prefix,
    if (message.content.indexOf(prefix) !== 0) return;

    // Here we separate the 'command' name, and the 'arguments' for the command.
    const args = message.content.slice(prefix.length).trim().split(/ +/g);
    const command = args.shift().toLowerCase();

    switch (command) {
        case 'help':                                            // display the help file
            let helpMsg = fs.readFileSync('./helpNotes.txt');
            message.channel.send('```' + helpMsg.toString() + '```');
            break;
        case 'ver':
            message.channel.send(`Version: ${ver} Running on server: ${os.type()} ${os.hostname()} ${os.platform()} ${os.cpus()[0].model}`);
            break;
        case 'ping':
            // Calculates ping between sending a message and editing it, giving a nice round-trip latency.
            // The second ping is an average latency between the bot and the websocket server (one-way, not round-trip)
            const m = await message.channel.send('Ping?');
            m.edit(`Pong! Latency is ${m.createdTimestamp - message.createdTimestamp}ms. API Latency is ${Math.round(client.ping)}ms`);
            break;
        case 'time':
            return getTime(message.channel.id);
        case 'test':
            return updateBot();
        default:
            // If command character + unknown command is given we at least need to let the user know
            let errorEmbed = `Unknown command: **${command}**`;
            return message.channel.send(errorEmbed);
    }
});

// This will send the message after the parser creates the string
function getTime(channelIDArg) {
    let discordChannel = client.channels.get(channelIDArg);
    parser.getTimeMessage()
        .then((response) => {
            discordChannel.send(response);
        })
        .catch((err) => {
            discordChannel.send('Could not fetch Cestus time');
            console.log(err);
        })
}


//Updates the avatar and activity of the bot
function updateBot(){
    parser.getIRLState()
        .then(state =>{
            console.log(`current state: ${currentState}, got state: ${state.cycle}`)

            if (DAY === state.cycle) {
                if (currentState !== state.cycle){
                    client.user.setAvatar('avatars/day.png').catch(function (error) {
                        console.log(error);
                    });
                }
                client.user.setActivity(`DAY - ` +
                    state.until_h.toString() +
                    'h' +
                    state.until_m.toString() +
                    'm until NIGHT'
                ).catch(function (error) {
                    console.log(error)
                });
                currentState = DAY;
            }
            else if (NIGHT === state.cycle) {
                if (currentState !== state.cycle){
                    client.user.setAvatar('avatars/night.png').catch(function (error) {
                        console.log(error);
                    });
                }
                client.user.setActivity(`NIGHT - ` +
                    state.until_h.toString() +
                    'h' +
                    state.until_m.toString() +
                    'm until DAY'
                ).catch(function (error) {
                    console.log(error)
                });
                currentState = NIGHT;
            }
        });
}

