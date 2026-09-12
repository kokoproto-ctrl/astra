import { createHash } from 'node:crypto';

const hash = (event) => createHash('sha256').update(JSON.stringify(event)).digest('hex');
export class EvidenceLedger {
  #events = [];
  append(receipt) {
    const sequence = this.#events.length + 1;
    const previous_hash = this.#events.at(-1)?.event_hash ?? 'GENESIS';
    const event = { sequence, previous_hash, receipt };
    const event_hash = hash(event);
    this.#events.push({ ...event, event_hash });
    return { sequence, event_hash };
  }
  events() { return structuredClone(this.#events); }
  verify(events = this.#events) {
    let previous = 'GENESIS';
    return events.every((event, index) => event.sequence === index + 1 && event.previous_hash === previous && event.event_hash === hash({ sequence: event.sequence, previous_hash: event.previous_hash, receipt: event.receipt }) && ((previous = event.event_hash) || true));
  }
}
