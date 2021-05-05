

class InMemorySessionStore {
    constructor () {
        this.sessions = new Map();
    }

    findSession(username) {
        return this.sessions.get(username);
      }
    
      saveSession(username, session) {
        this.sessions.set(username, session);
      }
    
      findAllSessions() {
        return [...this.sessions.values()];
      }
}

module.exports = InMemorySessionStore;