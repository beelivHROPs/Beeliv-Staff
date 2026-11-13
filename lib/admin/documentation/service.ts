/**
 * DocumentationService: the single door the hooks use. Delegates to the active
 * adapter and adds NO business rules. To go live: change the one `adapter` line.
 */
import type { DocumentationAdapter } from "./adapter";
import { mockDocumentationAdapter } from "./mock";

const adapter: DocumentationAdapter = mockDocumentationAdapter; // DEV FIXTURE until the backend adapter exists

export const subscribeDocumentation: DocumentationAdapter["subscribe"] = (l) => adapter.subscribe(l);
export const listDocuments: DocumentationAdapter["listDocuments"] = (q) => adapter.listDocuments(q);
export const getDocument: DocumentationAdapter["getDocument"] = (id) => adapter.getDocument(id);
export const verifyDocument: DocumentationAdapter["verify"] = (id) => adapter.verify(id);
export const requestResubmission: DocumentationAdapter["requestResubmission"] = (id, input) => adapter.requestResubmission(id, input);
export const replaceDocument: DocumentationAdapter["replace"] = (id) => adapter.replace(id);
