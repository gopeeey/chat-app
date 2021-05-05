// class MessageStore {
//     findSession(id) {}
//     saveSession(id, session) {}
// }

class InMemoryMessageStore {
    constructor () {
        this.messages = [];
    }

    findMessagesForUser(username) {
        const messages = this.messages.filter(message => (
          (message.from === username) || (message.to === username)
        ))
        return messages;
      }
    
      saveMessage(message) {
        this.messages.push(message);
      }
}

module.exports = InMemoryMessageStore;