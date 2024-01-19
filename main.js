const Discord = require('discord.js');
const Client = new Discord.Client({intents: 3276799});
const { SlashCommandBuilder } = require('@discordjs/builders');
const fs = require('fs');
const path = require('path');
const discordApiKey = process.env.DISCORD_API_KEY;

// need to do a try catch to avoid crash when sending a message that is too long
// need to make a pretty print for the records (not just a JSON.stringify, a table would be nice)

const dir = "C:\\BDD\\"

//========= déclaration des exos =========//

var exos = new Map();
// si le fichier existe, on le lit et on met à jour le tableau nom du fichier => dir+exos.json
if(fs.existsSync(dir+"exos.json")){
  let data = fs.readFileSync(dir+"exos.json", 'utf8');
  exos = new Map(Object.entries(JSON.parse(data)));
  console.log("Exos loaded");
}
//sinon on le crée et on le remplit avec les exos par défaut
else {
  console.log("Exos not found, creating default exos");
  exos.set("Développé couché", "Développé couché");
  exos.set("Deadlift", "Deadlift");
  exos.set("Tractions", "Tractions");
  fs.writeFile(dir+"exos.json", JSON.stringify(Object.fromEntries(exos)), function(err) {
    if (err) throw err;
  });
}




const exosArray = Array.from(exos.entries()).map(([name, value]) => ({ name, value }));
console.log(exosArray);
//========= déclaration des commandes =========//

const ping = new SlashCommandBuilder()
  .setName('ping')
  .setDescription('Replies with pong or something else 😏');

const addCommand = new SlashCommandBuilder()
  .setName('add')
  .setDescription('Ajouter un record personnel')
  .addStringOption(option => option.setName('exo').setDescription('Dans quelle catégorie tu concoures ?').setRequired(true))
  .addIntegerOption(option => option.setName('poids').setDescription('Combien de kilos (ou de répétitions) ?').setRequired(true))
  .addStringOption(option => option.setName('unité').setDescription('lbs ou kg ? (kg par défaut), c\'est pour l\'autre con').setRequired(false)
  .addChoices(
    {name: 'lbs', value: 'lbs'},
    {name: 'kg', value: 'kg'},
  ));


const showCommand = new SlashCommandBuilder()
//si aucun paramètre, on affiche les records de l'utilisateur
//si user, on affiche les records de l'utilisateur mentionné
//si exo, on affiche les records de l'exo (pour tout le monde)
//si user et exo, on affiche les records de l'utilisateur pour l'exo

  .setName('show')
  .setDescription('Afficher les records personnels')
  .addUserOption(option => option.setName('utilisateur').setDescription('De qui veux-tu voir les records (par défaut, les tiens) ?').setRequired(false))
  .addStringOption(option => option.setName('exo').setDescription('Quel exercice ?').setRequired(false));

exosArray.forEach(exo => {
  addCommand.options[0].addChoices(exo);
  showCommand.options[1].addChoices(exo);
});

const showEx = new SlashCommandBuilder()
  .setName('showexo')
  .setDescription('Afficher la liste des exercices');

const showAll = new SlashCommandBuilder()
  .setName('showall')
  .setDescription('Afficher les records de tout le monde');


const addEx = new SlashCommandBuilder()
  .setName('addexo')
  .setDescription('Ajouter un exercice')
  .addStringOption(option => option.setName('exo').setDescription('Quel exercice ?').setRequired(true));

module.exports = {
  ping, addCommand, showCommand, addEx, showEx, showAll,
};

//========= function gestion des joueurs =========//

// Il y aura un fichier par joueur, avec son DiscordID en nom de fichier
// Le fichier contiendra un JSON avec les records personnels de l'utilisateur et son nom
// Si le fichier n'existe pas, on le crée
// Pour éviter de lire le fichier à chaque fois, on stocke les records dans un tableau en mémoire
// A chaque fois qu'un utilisateur ajoute un record, on met à jour le fichier et le tableau 
// A chaque fois qu'un utilisateur demande ses records, on lit le tableau et on lui renvoie
// A chaque fois qu'un utilisateur demande les records d'un autre, on lit le tableau et on lui renvoie
// A chaque fois qu'un utilisateur demande les records de tout le monde, le tableau et on lui renvoie
// A chaque fois qu'un utilisateur demande les records d'un exercice, on lit le tableau et on lui renvoie
// Au démarrage du bot, on lit tous les fichiers et on met à jour le tableau

// Creation du tableau en mémoire
var records = new Map();

// Lecture des fichiers et mise à jour du tableau
function loadRecords(){
  fs.readdir(dir, (err, files) => {
    files.forEach(file => {
      if (path.extname(file) === '.json') {
        fs.readFile(dir+file, 'utf8', function (err, data) {
          if (err) throw err;
          let fileName = path.basename(file, '.json');
          records.set(fileName, JSON.parse(data));
        });
      }
    });
  });
}

// sauvagarde du tableau dans les fichiers (un fichier par utilisateur)
function saveRecords() {
  records.forEach((value, key) => {
    fs.writeFile(dir + key+ ".json", JSON.stringify(value), 'utf8', function (err) {
      if (err) throw err;
      console.log(`Records saved for user ${key}`);
    });
    
  });
  console.log("Records saved");
}


// fonction d'ajout d'un exercice
function addExo(name){
  //check si l'exo existe déjà
  if(exos.has(name)){
    return false;
  }
  exos.set(name, name);
  exosArray.push({name, value: name});
  fs.writeFile(dir+"exos.json", JSON.stringify(Object.fromEntries(exos)), function(err) {
    if (err) throw err;
  });
  
  addCommand.options[0].addChoices({name: name, value: name});
  showCommand.options[1].addChoices({name: name, value: name});

  
  // update commandes for all guilds
  Client.guilds.cache.forEach(guild => {
    guild.commands.fetch().then(commands => {
      const addCommandToUpdate = commands.find(cmd => cmd.name === 'add');
      const showCommandToUpdate = commands.find(cmd => cmd.name === 'show');

      if (addCommandToUpdate) {
        guild.commands.edit(addCommandToUpdate.id, addCommand);
      }

      if (showCommandToUpdate) {
        guild.commands.edit(showCommandToUpdate.id, showCommand);
      }
    });
  });
  return true;
}

// fonction d'ajout d'un record

function addRecord(user, exo, score){
  if(records.has(user)){
    records.get(user)[exo] = score;
    console.log(`Record added for user ${user} : ${exo} ${score}`);
    console.log(records.get(user));
  }
  else{
    let newrecords = {};
    newrecords[exo] = score;
    records.set(user, newrecords);
    console.log(records);
    console.log(`1Record added for user ${user} : ${exo} ${score}`);
  }
  saveRecords();
  console.log(records);
}

// fonction de récupération des records

function getRecordsuser(user){
  if(records.has(user)){
    return records.get(user);
  }
  else{
    return null;
  }
}

// fonction de récupération des records d'un exercice

function getRecordsExo(exo){
  var recordsExo = new Map();
  records.forEach((value, key) => {
    if(value[exo]){
      recordsExo.set(key, value[exo]);
    }
  });
  return recordsExo;
}

//========= gestion des commandes =========//

Client.on('ready', () => {
  console.log(`Logged in as ${Client.user.tag}!`);
  loadRecords();
  // load commandes
  const commands = [ping, addCommand, showCommand, addEx, showEx, showAll];
  Client.guilds.cache.forEach(guild => {
    //guild.commands.set([]); // Clear all commands for the guild
    commands.forEach(command => {
      guild.commands.create(command); // Create each command
    });
  });
  console.log("Commands loaded");
});

//faire en async avec une bdd a l'arrache c'est pas ouf
Client.on('interactionCreate', async interaction => {

  if (!interaction.isCommand()) return;

  const { commandName, options } = interaction;

  if (commandName === 'ping') {
    const replies = [ 
      'Pong!', 'Pong! Pong!', 'Oui?', 'Quoi?', 'Oui, je suis là',
      'Le saviez-vous ? Le ping est une unité de mesure de distance en informatique, correspondant à la durée de parcours d\'un signal entre deux machines',
      'Le saviez-vous ? Ce bot est codé en JavaScript avec la librairie Discord.js',
      'Comment puis-je vous aider ?',
      'Vous pouvez m\'aider en consultant la page github du projet : https://github.com/FireGh0st/DiscordBotMuscu',
      'Cette commande /ping est une commande de test, elle ne sert à rien, mais elle est là pour vous faire plaisir',
    ];
      await interaction.reply(replies[Math.floor(Math.random() * replies.length)]);
      return;
  }

  if (commandName === 'add') {
    const exo = options.getString('exo');
    var score = options.getInteger('poids');
    console.log(exo);
    //si l'unité est lbs, on convertit en kg
    if(options.getString('unité') === 'lbs'){
      score = Math.round(score/2.2046);
    }
    addRecord(interaction.user.id, exo, score);
    await interaction.reply(`Record ajouté : ${exo} ${score}`);
    return;
  }

  // I technically need to make a pretty print... but you know...
  if (commandName === 'show') {
    //si aucun paramètre, on affiche les records de l'utilisateur
    //si user, on affiche les records de l'utilisateur mentionné
    //si exo, on affiche les records de l'exo (pour tout le monde)
    //si user et exo, on affiche les records de l'utilisateur pour l'exo
    const user = options.getUser('utilisateur');
    const exo = options.getString('exo');

    if(user){
      if(exo){
        const records = getRecordsuser(user.id);
        const record = records[exo];
        if(record){
          await interaction.reply(`Records de \`${user.username}\` pour ${exo} : ${record}`);
        }
        else{
          await interaction.reply(`Aucun record de \`${user.username}\` pour ${exo}`);
        }
      }
      else{
        // Tout les scores d'un utilisateur: afficher dans l'ordre des exos
        const records = getRecordsuser(user.id);
        let recordsPretty = '';
        exosArray.forEach(exo => {
          const record = records[exo.name];
          if (record) {
            recordsPretty += `- ${exo.name} : ${record}\n`;
          }
        });
        if(recordsPretty){
          await interaction.reply(`Records de \`${user.username}\` :\n${recordsPretty}`);
        }
        else{
          await interaction.reply(`Aucun record de \`${user.username}\``);
        }
      }
    }
    else{
      if(exo){
        // Tout les scores d'un exercice: afficher du plus grand au plus petit
        const records = getRecordsExo(exo);
        if(records){
          const recordsPretty = (await Promise.all(
            Array.from(records.entries()).map(async ([id, value]) => {
              if (!/^\d+$/.test(id)) {
                console.log(`Skipping invalid ID: ${id}`);
                return;
              }
              const user = await Client.users.fetch(id);
              return { username: user.username, value: value };
            })
          )).filter(record => record !== undefined);

          recordsPretty.sort((a, b) => b.value - a.value);
          const recordsPrettyStr = recordsPretty.map(record => `- \`${record.username}\` : ${record.value}`).join('\n');
          await interaction.reply(`Records pour ${exo} :\n${recordsPrettyStr}`);
        }
        else{
          await interaction.reply(`Aucun record pour ${exo}`);
        }
      }
      else{
        const records = getRecordsuser(interaction.user.id);
        if(records){
          const recordsPretty = Object.entries(records).map(([name, value]) => ({ name, value })).map(record => `- ${record.name} : ${record.value}`).join('\n');
          await interaction.reply(`Vos records :\n${recordsPretty}`);
        }
        else{
          await interaction.reply(`Aucun record pour vous, ajoutez-en un avec la commande \`/add\``);
        }
      }
    }
    return;
  }

  if (commandName === 'addexo') {
    const exo = options.getString('exo');
    if(addExo(exo)){
      await interaction.reply(`Exercice ajouté : ${exo}`);
    }
    else{
      await interaction.reply(`L'exercice ${exo} existe déjà`);
    }
    return;
  }
  //pretty print: ✅
  if (commandName === 'showexo') {
    const exosList = exosArray.map(exo => `- \`${exo.name}\``).join('\n');
    await interaction.reply(`Exercices :\n${exosList}`);
    return;
  }

  // also need to make a pretty print...
  if (commandName === 'showall') {
    var recordsAll = new Map();
    records.forEach((value, key) => {
      recordsAll.set(key, value);
    });

    let exerciseList = new Set();
    recordsAll.forEach(userRecords => {
      for (let exo of Object.keys(userRecords)) {
        exerciseList.add(exo);
      }
    });
    exerciseList = Array.from(exerciseList);
/*
    // get the longest exercise name
    let longestExo = exerciseList.reduce((a, b) => a.length > b.length ? a : b);
    // get the longest username not counting the user IDs
    let users = await Promise.all(
      Array.from(recordsAll.keys())
        .filter(userId => /^\d+$/.test(userId))
        .map(userId => Client.users.fetch(userId))
    );

    let longestUser = users.reduce((longest, user) => {
      return (user.username.length > longest.length) ? user.username : longest;
    }, '');

    let space = Math.max(longestExo.length, longestUser.length) ;
    console.log(`Longest exercise name: ${longestExo}`);
    console.log(`Longest username: ${longestUser}`);
    console.log(`Space: ${space}`);
    let table = '```';
    table += 'Username'.padEnd(space) + ' | ' + exerciseList.map(exo => exo.padEnd(space)).join(' | ') + '\n';
    table += ''.padEnd(space, '-') + ' | ' + exerciseList.map(() => ''.padEnd(space, '-')).join(' | ') + '\n';

    for (let [userId, userRecords] of recordsAll.entries()) {
      if (!/^\d+$/.test(userId)) {
        console.log(`Skipping invalid ID: ${userId}`);
        continue;
      }
      const user = await Client.users.fetch(userId);
      table += user.username.padEnd(space) + ' | ';
      table += exerciseList.map(exo => (userRecords[exo] || 'N/A').toString().padEnd(space)).join(' | ') + '\n';
    }

    table += '```';
    await interaction.reply(`Records de tout le monde :\n${table}`);*/
    let embed = new Discord.EmbedBuilder()
      .setTitle('Records de tout le monde')
      .setColor(0x0099ff);

    let longestExoLength = Math.max(...exerciseList.map(exo => exo.length));

    for (let [userId, userRecords] of recordsAll.entries()) {
      if (!/^\d+$/.test(userId)) {
        console.log(`Skipping invalid ID: ${userId}`);
        continue;
      }
      const user = await Client.users.fetch(userId);
      let value = exerciseList.map(exo => `${exo}: ${'\u2000'.repeat(longestExoLength - exo.length)}${userRecords[exo] || 'N/A'}`).join('\n');
      embed.addFields({ name: `\`${user.username}\``, value: `\`\`\`${value}\`\`\``, inline: true});
    }

    await interaction.reply({ embeds: [embed] });

    return;
  }
   

});
console.log(discordApiKey)
Client.login(discordApiKey);