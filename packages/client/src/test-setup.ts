/**
 * Test setup — wires happy-dom globals before any imports.
 *
 * This file must be imported FIRST in any test file that
 * uses GenicElement, because GenicElement extends HTMLElement.
 *
 * Usage: import './test-setup.js' at the top of your test file.
 */

import { Window } from 'happy-dom';

const window = new Window();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).Document = window.Document;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).HTMLElement = window.HTMLElement;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).customElements = window.customElements;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).document = window.document;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).Event = window.Event;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).CustomEvent = window.CustomEvent;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).Node = window.Node;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).ShadowRoot = window.ShadowRoot;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).NodeList = window.NodeList;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).HTMLDivElement = window.HTMLDivElement;
