# Longfellow Verifier

## Running the Verifier Locally

### Prerequisites

The verifier server requires a Java development environment and Gradle. Ensure that Java is installed and available on the system `PATH`.

Verify the environment with:

```bash
java -version
./gradlew --version
```

### Build

From the repository root, build the verifier server with:

```bash
./gradlew multipaz-verifier-server:build
```

### Start the Server

Start the verifier server using:

```bash
./gradlew multipaz-verifier-server:run
```

The server address and port are determined by the server configuration and are reported in the application startup output.

### Optional Records Server Configuration

When a local records server is available, its URL can be supplied as a runtime parameter:

```bash
./gradlew multipaz-verifier-server:run \
  --args="-param enrollment_server_url=http://localhost:8004"
```

The records server must be running and accessible at the specified URL.

### Development

For source-level development, the main server entry point is:

```text
multipaz-verifier-server/.../Main.kt
```

The reusable verifier routing layer is located in:

```text
multipaz-verifier/src/main/java/org/multipaz/verifier/server/routing.kt
```

The verifier request and presentation handling is primarily implemented in:

```text
multipaz-verifier-server/.../request/verifier.kt
```

Standard mdoc verification is implemented in:

```text
multipaz/src/commonMain/kotlin/org/multipaz/mdoc/response/DeviceResponse.kt
multipaz/src/commonMain/kotlin/org/multipaz/mdoc/response/MdocDocument.kt
```

## 1. Overview

This repository contains the verifier side of the digital-identity flow.

It has two closely related layers:

- **`multipaz-verifier`** — reusable verifier functionality for presentation requests, response processing, sessions, and result construction.
- **`multipaz-verifier-server`** — the application server layer. It exposes HTTP endpoints, creates protocol-specific requests, handles the verifier flow, and adds the Longfellow zero-knowledge-proof verification path.

The implementation is built on Multipaz and supports mdoc / ISO 18013-5 presentations, OpenID4VP, W3C Digital Credentials API flows, and Longfellow-backed zero-knowledge proofs.

---

## 2. Role in 

The  flow can be viewed as:

```text
Issuer ───── issuance ─────> Wallet
                               │
                               │ presentation
                               ▼
                           Verifier
                               │
                    ┌──────────┼──────────┐
                    ▼          ▼          ▼
                 mdoc       issuer     Longfellow
                 checks      trust         ZKP
```

The verifier does not create the user's credential. Its responsibility is to:

1. Create a presentation request.
2. Bind the request to a verifier session and nonce.
3. Receive the wallet's presentation.
4. Reconstruct the required session context.
5. Verify the cryptographic integrity of the presentation.
6. Verify issuer trust separately.
7. Verify Longfellow zero-knowledge proofs when applicable.
8. Return the claims requested by the application.

---

## 3. Repository Structure

```text
Longfellow-verifier/
│
├── multipaz/
│   └── Core Multipaz implementation
│
├── multipaz-server/
│   └── Server-side presentation verification
│
├── multipaz-verifier/
│   └── Reusable verifier/session/request processing
│
├── multipaz-verifier-server/
│   └── verifier HTTP server and application flow
│
├── multipaz-longfellow/
│   └── Longfellow integration
│
├── multipaz-doctypes/
│   └── Document type definitions
│
├── config/
│   └── Shared configuration
│
└── gradlew
    └── Gradle wrapper
```

Important source areas:

```text
multipaz-verifier/
    src/main/java/org/multipaz/verifier/

multipaz-verifier-server/
    src/main/java/org/multipaz/verifier/server/

multipaz-server/
    src/main/java/org/multipaz/server/presentment/

multipaz/
    src/commonMain/kotlin/org/multipaz/mdoc/
```

---

## 4. High-Level Architecture

The verifier can be understood as a layered pipeline:

```text
HTTP request
    │
    ▼
multipaz-verifier-server
    │
    │ application/protocol handling
    ▼
multipaz-verifier
    │
    │ session + request orchestration
    ▼
multipaz-server
    │
    │ PresentmentRecord
    ▼
DeviceResponse
    │
    ▼
MdocDocument
    │
    ├── issuer signature
    ├── MSO checks
    ├── device authentication
    ├── issuer namespace digests
    └── transaction hashes
```

For a Longfellow ZK presentation there is an additional path:

```text
DeviceResponse
    │
    └── zkDocuments
            │
            ▼
       ZkSystemSpec
            │
            ▼
         ZkSystem
            │
            ▼
       verifyProof(...)
            │
            ▼
        Longfellow
```

**Normal mdoc verification and Longfellow ZKP verification are separate operations.**

---

## 5. Server Entry Point

The application entry point is:

```text
multipaz-verifier-server/
└── .../Main.kt
```

`Main` acts as the composition root. It registers the important verifier dependencies:

```kotlin
add(DocumentTypeRepository::class, documentTypeRepo)
add(TrustManagerInterface::class, getIssuerTrustManager())
add(VerifierAssistant::class, VerifierAssistantImpl)
```

It then configures the server routing.

The entry point mainly performs dependency wiring and startup; the actual verification logic is implemented in the modules below it.

---

## 6. HTTP Routing

The server configures routes in:

```text
multipaz-verifier-server/
└── .../ApplicationExt.kt
```

The reusable verifier routes are registered by:

```text
multipaz-verifier/
└── .../server/routing.kt
```

Important reusable endpoints include:

```text
POST /make_request
GET  /get_request/{sessionId}
POST /direct_post/{sessionId}
GET  /get_result/{sessionId}
POST /process_response
```

The application-specific server also exposes commands such as:

```text
getAvailableRequests
openid4vpBegin
openid4vpRequest
openid4vpResponse
openid4vpGetData
dcBegin
dcBeginRawDcql
dcGetData
annexABegin
annexARequest
annexAGetData
```

---

## 7. Verifier Sessions

A presentation is associated with a verifier session.

The reusable verifier session contains:

```kotlin
data class Session(
    val nonce: ByteString,
    val encryptionPrivateKey: EcPrivateKey,
    val dcqlQuery: String,
    val jsonTransactionData: List<String>?,
    var presentmentRecord: PresentmentRecord?,
    var result: String? = null
)
```

The session therefore provides:

- a random nonce
- an ephemeral P-256 encryption key
- the DCQL request
- transaction data
- the received presentation
- the final verification result

The specialized server session additionally tracks request format, document type, protocol, nonce, origin, host, response URI, device responses, verifiable presentations, session transcript, and reader engagement.

This state is important because verification must use the same session context that was used when the wallet generated its response.

---

## 8. Request Generation and DCQL

The verifier starts by deciding which credentials and claims it needs.

The request is represented using **DCQL (Digital Credentials Query Language)**.

```text
Verifier
   │
   │ "I need these claims"
   ▼
DCQL
   │
   ▼
Presentation request
   │
   ▼
Wallet
```

The reusable `makeRequest()` flow:

1. Receives an application request.
2. Passes it through `VerifierAssistant.processRequest()`.
3. Extracts the DCQL query.
4. Determines the exchange protocols.
5. Creates a verifier session.
6. Generates a Digital Credentials API request.

If no protocols are specified, the default exchange protocols are:

```text
org-iso-mdoc
openid4vp-v1-signed
```

If the requested credential formats are non-mdoc, the ISO mdoc exchange protocol is removed.

---

## 9. VerifierAssistant

Application-specific customization is provided by:

```text
multipaz-verifier/
└── .../customization/VerifierAssistant.kt
```

It exposes:

```kotlin
interface VerifierAssistant {
    suspend fun processRequest(request: JsonObject): ExpandedRequest?
    suspend fun processResponse(presentment: VerifierPresentment): JsonObject?
}
```

`processRequest()` can validate or modify a request before it becomes a wallet-facing presentation request.

`processResponse()` is called after successful verification and can customize the final application response.

This keeps generic verifier behavior separate from application-specific policy.

---

## 10. Receiving the Wallet Presentation

The reusable verifier has two important response paths.

For:

```text
POST /process_response
```

the verifier:

1. Reads the session ID.
2. Reads the Digital Credentials response.
3. Determines the protocol.
4. Builds a `PresentmentRecord`.
5. Calls `processResult()`.
6. Stores the result in the session.

For ISO mdoc:

```text
DC response
    │
    ▼
PresentmentRecordMdoc
```

For OpenID4VP:

```text
DC response
    │
    ▼
PresentmentRecordOpenID4VP
```

---

## 11. PresentmentRecord

The common abstraction is located under:

```text
multipaz-server/
└── .../presentment/
```

Important classes are:

```text
PresentmentRecord
PresentmentRecordMdoc
PresentmentRecordOpenID4VP

PresentmentResult
PresentmentResultMdoc
PresentmentResultSdJwt
```

The core abstraction is:

```kotlin
abstract suspend fun verifyNonce(nonce: ByteString)

abstract suspend fun verify(atTime: Instant): List<PresentmentResult>
```

The generic processing sequence is:

```text
processResult()
      │
      ├── verifyNonce()
      ├── presentmentRecord.verify()
      ├── createResult()
      └── VerifierAssistant.processResponse()
```

This is the bridge between the presentation protocol and cryptographic credential verification.

---

## 12. ISO mdoc Verification

For an mdoc response:

```text
PresentmentRecordMdoc.verify()
        │
        ▼
DeviceResponse.fromDataItem()
        │
        ▼
DeviceResponse.verify()
        │
        ▼
MdocDocument.verify()
```

`PresentmentRecordMdoc` first validates the relationship between the received `encryptionInfo` and the session transcript.

It then parses the `DeviceResponse`.

Finally it invokes:

```kotlin
deviceResponse.verify(
    sessionTranscript = sessionTranscript,
    eReaderKey = null,
    transactionDataList = getTransactionData(documentTypeRepository),
    atTime = atTime
)
```

After document integrity succeeds, issuer trust is evaluated separately:

```kotlin
trustManager.verify(
    document.issuerCertChain.certificates,
    atTime
)
```

This separation is intentional:

```text
Cryptographic integrity
        ≠
Issuer trust
```

A correctly signed document is not automatically trusted by the verifier.

---

## 13. DeviceResponse Verification

The implementation is:

```text
multipaz/
└── src/commonMain/kotlin/org/multipaz/mdoc/response/DeviceResponse.kt
```

`DeviceResponse.verify()` iterates over returned documents and delegates to:

```kotlin
document.verify(
    sessionTranscript,
    eReaderKey,
    transactionData,
    atTime
)
```

It controls access to parsed documents: a response received from a remote device must be verified before its `documents` property can be accessed.

The documented checks include:

- issuer MSO signature
- document type consistency
- MSO validity period
- issuer namespace digests
- device authentication
- transaction data hashes

The implementation explicitly leaves these to the application:

- issuer certificate trust
- revocation checks
- zero-knowledge-proof verification
- encrypted-document handling

---

## 14. MdocDocument Verification

Detailed normal mdoc verification is implemented in:

```text
multipaz/
└── src/commonMain/kotlin/org/multipaz/mdoc/response/MdocDocument.kt
```

The sequence is:

```text
MdocDocument.verify()
       │
       ├── 1. Verify issuer/MSO signature
       │
       ├── 2. Check DocType
       │
       ├── 3. Check MSO validity
       │
       ├── 4. Build DeviceAuthentication
       │
       ├── 5. Verify device authentication
       │
       ├── 6. Verify issuer namespace digests
       │
       └── 7. Verify transaction hashes
```

### 14.1 Issuer/MSO signature

The issuer certificate chain is obtained from the COSE `x5chain` header.

The leaf certificate public key is used to verify the COSE_Sign1 signature over the MSO.

```text
COSE_Sign1
   │
   ├── protected headers
   ├── MSO payload
   └── signature
          │
          ▼
   issuer certificate
          │
          ▼
      public key
          │
          ▼
   verify signature
```

If the signature fails, the document is rejected.

### 14.2 DocType

The response document's `docType` must match the MSO's `docType`.

```text
response.docType == MSO.docType
```

### 14.3 MSO validity

The verification time must satisfy:

```text
MSO.validFrom
    ≤
verification time
    ≤
MSO.validUntil
```

### 14.4 Device Authentication

The verifier builds:

```text
DeviceAuthentication
    =
[
    "DeviceAuthentication",
    sessionTranscript,
    docType,
    encoded deviceNamespaces
]
```

For ECDSA device authentication, the verifier uses:

```text
MSO.deviceKey
```

to verify the device signature.

For MAC-based authentication, the verifier derives the MAC key using the reader key and device key.

Device authentication therefore binds the returned device data to the session transcript and document type.

### 14.5 Issuer namespace digests

The MSO contains value digests.

For each returned issuer-signed item, the verifier calculates the digest and compares it with the digest referenced by the item's `digestId`.

```text
IssuerSignedItem
       │
       ▼
digest algorithm from MSO
       │
       ▼
calculated digest
       │
       ▼
compare with MSO.valueDigests
```

This protects issuer-signed claims from modification.

### 14.6 Transaction data

For every requested transaction, the verifier expects:

```text
transaction_data_hash
transaction_data_hash_alg
```

It independently calculates the transaction hash and compares it with the device-provided hash.

---

## 15. Issuer Trust

Issuer signature verification and issuer trust are separate.

Normal mdoc verification proves:

```text
The MSO was signed by the private key
corresponding to the supplied signing certificate.
```

The trust manager determines:

```text
The certificate chain is trusted by this verifier.
```

The the verifier uses:

```kotlin
TrustManagerInterface
```

and:

```kotlin
trustManager.verify(
    document.issuerCertChain.certificates,
    atTime
)
```

Therefore a document can be cryptographically valid while still being rejected as untrusted.

---

## 16. Longfellow Zero-Knowledge Proof Verification

Longfellow verification is **not part of `DeviceResponse.verify()`**.

The `DeviceResponse` implementation explicitly places ZKP integrity checking at the application level.

A response can contain:

```text
DeviceResponse
    │
    └── zkDocuments
```

The the verifier handles these separately:

```text
handleGetDataMdoc()
       │
       ▼
DeviceResponse.verify()
       │
       ├── normal mdoc integrity
       │
       └── zkDocuments
              │
              ▼
       find ZkSystemSpec
              │
              ▼
       ZkSystemRepository.lookup(...)
              │
              ▼
       ZkSystem.verifyProof(...)
              │
              ▼
          Longfellow
```

The important interface is:

```kotlin
ZkSystem.verifyProof(
    zkDocument,
    zkSystemSpec,
    sessionTranscript
)
```

A ZK presentation therefore has two distinct verification layers:

```text
Layer 1: Normal mdoc integrity
 ├── issuer signature
 ├── MSO
 ├── device authentication
 ├── digests
 └── transaction binding

Layer 2: Zero-knowledge proof
 └── Longfellow proof verification
```

---

## 17. Why the Session Transcript Matters

The session transcript connects the credential presentation to the verifier session.

The verifier session contains a nonce and an ephemeral P-256 encryption key. The presentation flow uses this session information to construct or reconstruct the session transcript.

Device authentication then includes that transcript:

```text
Verifier session
      │
      ├── nonce
      ├── verifier identity/origin
      └── ephemeral key
             │
             ▼
       Session Transcript
             │
       ┌─────┴─────┐
       ▼           ▼
Device Auth      ZK proof
```

This provides session binding: a presentation generated for one verifier session cannot simply be reused as if it belonged to another session.

---

## 18. OpenID4VP Verification

`PresentmentRecordOpenID4VP` supports:

```text
mso_mdoc
dc+sd-jwt
```

For `mso_mdoc`, verification converges on the same core mdoc path:

```text
OpenID4VP
   │
   ▼
vp_token
   │
   ▼
mso_mdoc
   │
   ▼
DeviceResponse
   │
   ▼
DeviceResponse.verify()
   │
   ▼
MdocDocument.verify()
```

For `dc+sd-jwt`, the verifier uses the SD-JWT / SD-JWT+KB verification APIs.

The OpenID4VP implementation also performs issuer certificate-chain trust evaluation.

---

## 19. Result Construction

After verification succeeds, the verifier does not automatically return the complete credential.

The DCQL request determines which claims are returned.

```text
Verified presentation
        │
        ▼
DCQL requested documents
        │
        ▼
match result to request ID
        │
        ▼
extract requested claims
        │
        ▼
application result
```

For an mdoc result, the verifier includes requested claims and transaction results together with the issuer trust result.

---

## 20. Debugging and Verification Trace

The specialized verifier contains debugging and tracing support, including:

```text
rememberDcPresentationForDebug
sessionDebugSnapshot
addZkpBenchmarkLine
isZkpBenchmarkLine
```

When debugging a failed presentation, trace it in this order:

```text
1. Request creation
       ↓
2. Session creation
       ↓
3. Wallet response received
       ↓
4. Response decryption
       ↓
5. Session transcript reconstruction
       ↓
6. DeviceResponse parsing
       ↓
7. DeviceResponse.verify()
       ↓
8. MdocDocument.verify()
       ↓
9. TrustManager.verify()
       ↓
10. ZkSystem.verifyProof()
```

This helps distinguish protocol, session, credential-integrity, trust, and ZKP failures.

---

## 21. ZKP Benchmarking

The the verifier measures Longfellow verification time separately from normal mdoc verification.

The specialized verifier contains:

```text
formatBenchmarkDurationMs
isZkpBenchmarkLine
addZkpBenchmarkLine
```

The measurement surrounds the Longfellow `verifyProof()` operation.

Therefore:

```text
normal mdoc verification time
        ≠
Longfellow ZKP verification time
```

This separation is useful when analyzing the performance cost of zero-knowledge verification.

---

## 22. Running the Verifier

From the repository root:

```bash
./gradlew multipaz-verifier-server:run
```

On Windows:

```powershell
.\gradlew.bat multipaz-verifier-server:run
```

The verifier server is configured for Java 17.

If a local records/enrollment server is required, the server supports:

```bash
./gradlew multipaz-verifier-server:run   --args="-param enrollment_server_url=http://localhost:8004"
```

Check the repository configuration before assuming a particular verifier HTTP port, because the runtime port can be controlled by server configuration.

---

## 23. Requirements

The verifier is built around:

- Java/JVM
- Kotlin
- Gradle
- Ktor
- Multipaz
- Longfellow integration
- configured verifier trust management

The `multipaz-verifier-server` module targets Java 17.

Use the included Gradle wrapper:

```bash
./gradlew
```

---

## 24. Source-Code Map

| What you want to understand | Main source |
|---|---|
| Server startup | `multipaz-verifier-server/.../Main.kt` |
| Server routing | `multipaz-verifier-server/.../ApplicationExt.kt` |
| verifier commands | `multipaz-verifier-server/.../request/verifier.kt` |
| Generic verifier routes | `multipaz-verifier/.../server/routing.kt` |
| Generic request/response processing | `multipaz-verifier/.../request/verifyCredentials.kt` |
| Verifier session | `multipaz-verifier/.../session/Session.kt` |
| Requested claims | `multipaz-verifier/.../session/RequestedDocument.kt` |
| Application customization | `multipaz-verifier/.../customization/VerifierAssistant.kt` |
| Presentment abstraction | `multipaz-server/.../presentment/PresentmentRecord.kt` |
| ISO mdoc presentment | `multipaz-server/.../presentment/PresentmentRecordMdoc.kt` |
| OpenID4VP presentment | `multipaz-server/.../presentment/PresentmentRecordOpenID4VP.kt` |
| Top-level mdoc verification | `multipaz/.../mdoc/response/DeviceResponse.kt` |
| Detailed mdoc verification | `multipaz/.../mdoc/response/MdocDocument.kt` |
| ZKP abstraction | `multipaz/.../mdoc/zkp/ZkSystem.kt` |
| Longfellow implementation | `multipaz-longfellow/` |

---

## 25. Troubleshooting

### Signature on MSO failed

Inspect `MdocDocument.verify()`.

The verifier checks the COSE_Sign1 signature against the leaf certificate public key.

### DocType mismatch

Check:

```text
response docType
MSO docType
```

They must match.

### MSO expired

Check:

```text
mso.validFrom
mso.validUntil
```

against the verifier's `atTime`.

### Device authentication failed

Check:

```text
sessionTranscript
mso.deviceKey
deviceSignature/deviceMac
deviceNamespaces
```

A wrong session transcript changes the authenticated data.

### Digest mismatch

Check:

```text
MSO.valueDigests
IssuerSignedItem
digestAlgorithm
digestId
```

### Transaction hash failed

Check:

```text
transaction_data_hash
transaction_data_hash_alg
```

and compare the device-provided hash with the verifier's independently calculated hash.

### Issuer is not trusted

Signature verification and issuer trust are separate.

Inspect:

```text
TrustManagerInterface
getIssuerTrustManager()
trustManager.verify(...)
```

### Longfellow proof failed

First establish that normal mdoc verification succeeds:

```text
DeviceResponse.verify()
        ↓
MdocDocument.verify()
        ↓
TrustManager.verify()
        ↓
ZkSystem.verifyProof()
```

If the first stages succeed and `verifyProof()` fails, investigate the ZKP-specific implementation.

---

## 26. Relationship to Wallet and Issuer

The three components have different responsibilities.

```text
Issuer
  │
  │ creates and signs credential
  ▼
Wallet
  │
  │ stores credential and creates presentation
  ▼
Verifier
  │
  ├── verifies mdoc integrity
  ├── verifies issuer trust
  └── verifies Longfellow ZKP
```

### Issuer

The issuer:

- owns the issuer signing key
- constructs the credential/MSO
- signs the MSO
- supplies the issuer certificate chain

### Wallet

The wallet:

- stores the credential
- holds the device/credential private key
- creates the presentation
- creates device authentication
- can generate a Longfellow ZK proof

### Verifier

The verifier:

- creates the presentation request
- supplies session context
- verifies the returned presentation
- checks issuer trust
- verifies Longfellow proofs
- extracts requested claims

The issuer private signing key is never needed by the verifier. The wallet's device private key also remains on the wallet.

---

## 27. Normal mdoc vs Longfellow

The most important distinction for verifier development is:

```text
NORMAL MDOC
───────────
COSE signature
      ↓
MSO
      ↓
DocType
      ↓
Validity
      ↓
Device Authentication
      ↓
Value Digests
      ↓
Transaction Hashes

LONGFELLOW ZKP
──────────────
ZkDocument
      ↓
ZkSystemSpec
      ↓
ZkSystem
      ↓
verifyProof()
      ↓
Longfellow
```

Longfellow adds a separate proof-verification layer to the mdoc presentation architecture.

---

## 28. Development Workflow

Verifier request processing follows the path from the HTTP endpoint through the
session and presentation layers to credential verification:

```text
HTTP endpoint
    ↓
Verifier request/response handling
    ↓
Session
    ↓
PresentmentRecord
    ↓
DeviceResponse
    ↓
MdocDocument
    ↓
Issuer trust / Longfellow ZKP
```

This separation makes protocol handling, credential integrity, certificate
trust, transaction binding, and zero-knowledge proof verification independent
and easier to maintain.
