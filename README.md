# DiscordBotMuscu
This project is a Discord Bot, which allows the user to register his personal records in a database and to consult them later. The user can add his records, add exercises, consult the records...

## Commands list
- **/ping** : Check if the bot is online (various answers)
- **/addexo \<name>** : Add an exercise to the database
- **/add \<name> \<weight> [unit]** : Add a record to the database for the exercise \<name> with the weight \<weight> (and the unit \<unit> if specified)
- **/show** :
  - **no argument** : Show the records of the user
  - **\<user>** : Show the records of the user \<user>
  - **\<user> \<name>** : Show the records of the user \<user> for the exercise \<name>
  - **\<name>** : Show the records of the user for the exercise \<name>
- **/showexo** : Show the exercises list
- **/showall** : Show all the records of all the users

## License
This project is under the MIT license. See the [LICENSE](LICENSE) file for more details.
