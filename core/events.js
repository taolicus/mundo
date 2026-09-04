export class EventLog {
  constructor(capacity = 1000) {
    this.capacity = capacity;
    this.events = [];
    this.debug = false;
    this.seq = 0;
  }

  emit(type, data = {}) {
    const record = { seq: ++this.seq, type, ...data };
    if (this.debug) {
      const payload = { ...record };
      delete payload.seq;
      console.log(record.t != null ? `[${record.t}] ${type}` : type, payload);
    }
    this.events.push(record);
    if (this.events.length > this.capacity) {
      this.events.splice(0, this.events.length - this.capacity);
    }
    return record;
  }

  recent(n = 60) {
    return this.events.slice(-n);
  }

  recentFor(key, value, n = 30) {
    const out = [];
    for (let i = this.events.length - 1; i >= 0 && out.length < n; i--) {
      const e = this.events[i];
      if (e[key] === value) out.push(e);
    }
    return out.reverse();
  }

  count(type) {
    return this.events.filter((e) => e.type === type).length;
  }

  clear() {
    this.events = [];
  }
}

export const events = new EventLog();