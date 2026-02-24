import { TestDialogClient } from "./client"

const MOCK_DATA = [
  { id: "1", code: "SP-ALP-001", name: "Alpha Corp", email: "alpha@test.com", company: "Alpha", phone: "123", address: "addr1", contactPerson: "John", trn: "TRN001", status: "active", labId: "lab1", createdAt: "2025-01-01", updatedAt: "2025-01-01", _count: { contactPersons: 2 } },
  { id: "2", code: "SP-BET-002", name: "Beta Inc", email: "beta@test.com", company: "Beta", phone: "456", address: "addr2", contactPerson: "Jane", trn: "TRN002", status: "active", labId: "lab1", createdAt: "2025-01-02", updatedAt: "2025-01-02", _count: { contactPersons: 1 } },
  { id: "3", code: "SP-GAM-003", name: "Gamma LLC", email: "gamma@test.com", company: null, phone: null, address: null, contactPerson: null, trn: null, status: "inactive", labId: "lab1", createdAt: "2025-01-03", updatedAt: "2025-01-03", _count: { contactPersons: 0 } },
]

export default function TestDialogPage() {
  // Mimics the real customers page: server component passes serialized data to client
  return <TestDialogClient customers={JSON.parse(JSON.stringify(MOCK_DATA))} />
}
