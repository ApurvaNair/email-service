// Tracker class is used to manage sent emails and limit how many can be sent per minute
class Tracker {
  constructor(limitPerMinute = 5) {
    this.sentEmails = new Set();     
    this.timestamps = [];            
    this.limit = limitPerMinute;     
  }

  // Checks if this email ID was already sent before
  alreadySent(id) {
    return this.sentEmails.has(id);
  }

  // Stores email ID and time when it was sent
  remember(id) {
    this.sentEmails.add(id);           
    this.timestamps.push(Date.now());  
  }

  // Checks if we are allowed to send another email (not over the limit)
  canSend() {
    const oneMinuteAgo = Date.now() - 60000; 
    this.timestamps = this.timestamps.filter(t => t > oneMinuteAgo);
    return this.timestamps.length < this.limit;
  }
}

module.exports = Tracker;
