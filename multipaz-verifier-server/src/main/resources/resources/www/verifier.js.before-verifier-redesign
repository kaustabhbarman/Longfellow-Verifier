
// Keep in sync with verifier.html
var selectedProtocol = 'w3c_dc_mdoc_api'

// If the user clicks on one of the protocol entries, that becomes both the selected and the
// preferred protocol. If the selected protocol is disabled (because, for instance, the user selects
// a document that doesn't support the selected protocol), the selected protocol will be updated but
// the preferred one will remain the same. Then if the preferred one is enabled again, the selection
// will change back to the preferred protocol.
var preferredProtocol = selectedProtocol

var openid4vpUri = ''

async function onLoad() {
    const protocolDropdown = document.getElementById('protocolDropdown')
    protocolDropdown.addEventListener('hide.bs.dropdown', event => {
        var target = event.clickEvent.target
        var selected = target.getAttribute('value')
        if (selected === 'w3c_dc_mdoc_api' ||
            selected === 'w3c_dc_openid4vp_24' ||
            selected === 'w3c_dc_openid4vp_29' ||
            selected === 'w3c_dc_openid4vp_29_and_mdoc_api' ||
            selected === 'w3c_dc_openid4vp_24_and_mdoc_api' ||
            selected === 'w3c_dc_mdoc_api_and_openid4vp_29' ||
            selected === 'w3c_dc_mdoc_api_and_openid4vp_24' ||
            selected === 'uri_scheme_openid4vp_29' ||
            selected === 'uri_scheme_annex_a'
        ) {
            selectedProtocol = selected
            preferredProtocol = selectedProtocol
            protocolDropdown.innerHTML = target.innerHTML

            const openid4vp_sign_request_checkbox = document.getElementById("openid4vp-sign-request")
            openid4vp_sign_request_checkbox.hidden = (
                selected !== 'w3c_dc_openid4vp_24' &&
                selected !== 'w3c_dc_openid4vp_29' &&
                selected !== 'w3c_dc_openid4vp_29_and_mdoc_api' &&
                selected !== 'w3c_dc_openid4vp_24_and_mdoc_api' &&
                selected !== 'w3c_dc_mdoc_api_and_openid4vp_29' &&
                selected !== 'w3c_dc_mdoc_api_and_openid4vp_24'
            )

            const openid4vp_encrypt_response_checkbox = document.getElementById("openid4vp-encrypt-response")
            openid4vp_encrypt_response_checkbox.hidden = (
                selected !== 'w3c_dc_openid4vp_24' &&
                selected !== 'w3c_dc_openid4vp_29' &&
                selected !== 'w3c_dc_openid4vp_29_and_mdoc_api' &&
                selected !== 'w3c_dc_openid4vp_24_and_mdoc_api' &&
                selected !== 'w3c_dc_mdoc_api_and_openid4vp_29' &&
                selected !== 'w3c_dc_mdoc_api_and_openid4vp_24' &&
                selected !== 'uri_scheme_openid4vp_29'
            )

            const scheme = document.getElementById("scheme-form")
            scheme.hidden = (
                selected !== 'uri_scheme_openid4vp_29'
            )
        }
    })

    // Ask server what document types / requests are available and use this to
    // dynamically generate the UI..
    //
    const response = await callServer(
        'getAvailableRequests', {}
    )
    var active = true
    for (const dtwr of response.documentTypesWithRequests) {
      if (dtwr.mdocDocType != null) {
          // JSON uses supportsMdoc / supportsVc (see SampleRequest in verifier.kt)
          const mdocSamples = dtwr.sampleRequests.filter(sr => sr.supportsMdoc)
          addTab(dtwr.documentDisplayName + " (mdoc)", "mdoc", dtwr.mdocDocType, mdocSamples, active)
          active = false
      }
    }
}

function addTab(tabName, mdocOrVc, docTypeOrVct, sampleRequests, active) {
    // For the tab ID to be queryable using jQuery, we need to mask out special characters. Replace
    // anything that isn't a letter or number.
    var escapedDocTypeOrVct = docTypeOrVct.replace(/[^a-zA-Z0-9]/g,'_');
    var tabId = mdocOrVc + '-' + escapedDocTypeOrVct
    var activeStr = active ? "active" : ""
    $('<li class="nav-item" role="presentation">' +
    '<button class="nav-link ' + activeStr + '" data-bs-toggle="pill" id="pills-tab-' + tabId + '" data-bs-target="#pills-' + tabId + '" type="button" role="tab" aria-controls="pills-home" aria-selected="true">' +
      tabName +
    '</button>' +
    '</li>')
    .appendTo('#pills-tab')

    var str = '<div class="tab-pane fade show ' + activeStr + '" '
    str += 'id="pills-' + tabId + '" role="tabpanel" '
    str += 'aria-labelledby="pills-tab-' + tabId + '" tabindex="0"> '
    str += '  <div class="d-grid gap-2 mx-auto"> '
    for (sr of sampleRequests) {
        str += '    <button type="button" class="btn btn-primary btn-lg" '
        str += 'onclick="requestDocument(\'' + mdocOrVc + '\', \'' + docTypeOrVct + '\', \'' + sr.id + '\', null, null)" >'
        str += sr.displayName
        str += '    </button> '
    }
    str += '  </div> '
    str += '</div> '

    $(str).appendTo('#pills-tabContent')

    // When one of the document tabs is selected, update the available protocol dropdown options.
    $('#pills-tab-' + tabId).on('shown.bs.tab', function (e) {
        updateProtocolOptions(mdocOrVc);
    });
}

function updateProtocolOptions(_mdocOrVc) {
    const protocolDropdown = document.getElementById('protocolDropdown')
    const mdocOnly = document.querySelectorAll('.mdoc-only');

    // This verifier only exposes ISO mDL (mdoc) flows.
    mdocOnly.forEach(option => {
        option.classList.remove('disabled');
        option.removeAttribute('disabled');
        if (preferredProtocol == option.getAttribute('value')) {
            selectedProtocol = preferredProtocol
            protocolDropdown.innerHTML = option.innerHTML;
        }
    });

    const openid4vp_sign_request_checkbox = document.getElementById("openid4vp-sign-request")
    openid4vp_sign_request_checkbox.hidden = (
        selectedProtocol !== 'w3c_dc_openid4vp_24' &&
        selectedProtocol !== 'w3c_dc_openid4vp_29' &&
        selectedProtocol !== 'w3c_dc_openid4vp_29_and_mdoc_api' &&
        selectedProtocol !== 'w3c_dc_openid4vp_24_and_mdoc_api' &&
        selectedProtocol !== 'w3c_dc_mdoc_api_and_openid4vp_29' &&
        selectedProtocol !== 'w3c_dc_mdoc_api_and_openid4vp_24'
    )
    const openid4vp_encrypt_response_checkbox = document.getElementById("openid4vp-encrypt-response")
    openid4vp_encrypt_response_checkbox.hidden = (
        selectedProtocol !== 'w3c_dc_openid4vp_24' &&
        selectedProtocol !== 'w3c_dc_openid4vp_29' &&
        selectedProtocol !== 'w3c_dc_openid4vp_29_and_mdoc_api' &&
        selectedProtocol !== 'w3c_dc_openid4vp_24_and_mdoc_api' &&
        selectedProtocol !== 'w3c_dc_mdoc_api_and_openid4vp_29' &&
        selectedProtocol !== 'w3c_dc_mdoc_api_and_openid4vp_24' &&
        selectedProtocol !== 'uri_scheme_openid4vp_29'
    )
}

async function onLoadRedirect() {
    const urlParams = new URLSearchParams(location.search);
    const sessionId = urlParams.get('sessionId');
    const response = await callServer(
        'openid4vpGetData',
        {
            sessionId: sessionId,
        }
    )
    var tbodyRef = document.getElementById('resultTable').getElementsByTagName('tbody')[0]
    for (const page of response.pages) {
        for (const line of page.lines) {
            var newRow = tbodyRef.insertRow()
            var keyCell = newRow.insertCell()
            keyCell.appendChild(document.createTextNode(line.key))
            var valueCell = newRow.insertCell()
            valueCell.appendChild(document.createTextNode(line.value))
        }
    }
    console.log(response)
}

function redirectClose() {
    console.log('redirectClose')
    window.close()
}

async function requestDocument(format, docType, requestId, rawDcql, multiDocumentRequestId) {
    console.log('requestDocument, format=' + format + ' docType=' + docType + ' requestId=' + requestId + ' protocol=' + selectedProtocol)
    if (selectedProtocol === 'uri_scheme_openid4vp_29') {
        if (document.getElementById("scheme-input").value === "") {
            alert("You must specify a non-empty scheme")
            return
        }
        var signRequest = document.getElementById("openid4vp-sign-request-input").checked
        var encryptResponse = document.getElementById("openid4vp-encrypt-response-input").checked
        const response = await callServer(
            'openid4vpBegin',
            {
                format: format,
                docType: docType,
                requestId: requestId,
                rawDcql: rawDcql != null ? rawDcql : "",
                multiDocumentRequestId: multiDocumentRequestId != null ? multiDocumentRequestId : "",
                protocol: selectedProtocol,
                origin: location.origin,
                host: location.host,
                scheme: document.getElementById("scheme-input").value,
                signRequest: true, // OpenID4VP 1.0 w/ URI scheme requires signed request
                encryptResponse: encryptResponse
            }
        )
        window.location = response.uri
    } else if (selectedProtocol === 'uri_scheme_annex_a') {
        const response = await callServer(
            'annexABegin',
            {
                format: format,
                docType: docType,
                requestId: requestId,
                rawDcql: rawDcql != null ? rawDcql : "",
                multiDocumentRequestId: multiDocumentRequestId != null ? multiDocumentRequestId : "",
                protocol: selectedProtocol,
                origin: location.origin,
                host: location.host,
            }
        )
        window.location = response.uri
        const credentialResponse = await callServer(
            'annexAGetData',
            {
                sessionId: response.sessionId,
            }
        )
        showResponse(credentialResponse)
    } else if (selectedProtocol === "w3c_dc_mdoc_api" ||
               selectedProtocol === "w3c_dc_openid4vp_24" ||
               selectedProtocol === 'w3c_dc_openid4vp_29' ||
               selectedProtocol === 'w3c_dc_openid4vp_29_and_mdoc_api' ||
               selectedProtocol === 'w3c_dc_openid4vp_24_and_mdoc_api' ||
               selectedProtocol === 'w3c_dc_mdoc_api_and_openid4vp_29' ||
               selectedProtocol === 'w3c_dc_mdoc_api_and_openid4vp_24') {
        try {
            var signRequest = document.getElementById("openid4vp-sign-request-input").checked
            var encryptResponse = document.getElementById("openid4vp-encrypt-response-input").checked
            const response = await callServer(
                'dcBegin',
                {
                    format: format,
                    docType: docType,
                    requestId: requestId,
                    rawDcql: rawDcql != null ? rawDcql : "",
                    multiDocumentRequestId: multiDocumentRequestId != null ? multiDocumentRequestId : "",
                    protocol: selectedProtocol,
                    origin: location.origin,
                    host: location.host,
                    signRequest: signRequest,
                    encryptResponse: encryptResponse
                }
            )
            console.log(response)
            if (response.error != null) {
                alert("Something went wrong: " + response.error)
            } else {
                var requestString = JSON.parse(response.dcRequestString)
                var requestString2 = null
                if (response.dcRequestString2 != null) {
                    requestString2 = JSON.parse(response.dcRequestString2)
                }
                dcRequestCredential(
                    response.sessionId,
                    response.dcRequestProtocol,
                    requestString,
                    response.dcRequestProtocol2,
                    requestString2
                )
            }
        } catch (err) {
            alert("Something went wrong: " + err)
        }
    }
}

async function dcRequestCredential(sessionId, dcRequestProtocol, dcRequest, dcRequestProtocol2, dcRequest2) {
    if (!navigator.credentials || !navigator.credentials.get) {
        alert("Digital Credentials API is not available. Please enable it via chrome://flags#web-identity-digital-credentials.");
        return;
    }
    try {
        console.log('protocol: ', dcRequestProtocol)
        console.log('request: ', dcRequest)
        var requests = []
        requests.push({
            protocol: dcRequestProtocol,
            data: dcRequest
        })
        if (dcRequestProtocol2 != null) {
            console.log('protocol2: ', dcRequestProtocol2)
            console.log('request2: ', dcRequest2)
            requests.push({
                protocol: dcRequestProtocol2,
                data: dcRequest2
            })
        }
        const credentialResponse = await navigator.credentials.get({
            digital: {
                requests: requests
            },
            mediation: 'required',
          })
        console.log('credentialResponse ', credentialResponse)
        dcProcessResponse(sessionId, credentialResponse)
    } catch (err) {
        alert(err)
    }
}

async function dcProcessResponse(sessionId, credentialResponse) {
    var dataStr
    if (typeof(credentialResponse.data) == 'string') {
        dataStr = credentialResponse.data
    } else {
	    dataStr = JSON.stringify(credentialResponse.data)
    }
    const response = await callServer(
        'dcGetData',
        {
            sessionId: sessionId,
            credentialProtocol: credentialResponse.protocol,
            credentialResponse: dataStr
        }
    )
    showResponse(response)
}

function isCborDiagnosticFieldKey(key) {
    return typeof key === 'string' && key.endsWith('CborDiagnostic')
}

/**
 * Pretty-print debug JSON. Unlike JSON.stringify(..., null, 2), multiline strings under
 * *CborDiagnostic keys are printed with real newlines so CBOR diagnostics stay readable.
 */
function formatDebugJson(value, indent) {
    indent = indent || 0
    const pad = ' '.repeat(indent)
    const padInner = ' '.repeat(indent + 2)
    if (value === null) return 'null'
    if (typeof value === 'boolean' || typeof value === 'number') return JSON.stringify(value)
    if (typeof value === 'string') return JSON.stringify(value)
    if (Array.isArray(value)) {
        if (value.length === 0) return '[]'
        const lines = value.map(item => padInner + formatDebugJson(item, indent + 2))
        return '[\n' + lines.join(',\n') + '\n' + pad + ']'
    }
    if (typeof value === 'object') {
        const keys = Object.keys(value)
        if (keys.length === 0) return '{}'
        const parts = keys.map(k => {
            const v = value[k]
            if (typeof v === 'string' && isCborDiagnosticFieldKey(k)) {
                const bodyPad = ' '.repeat(indent + 4)
                return padInner + JSON.stringify(k) + ':\n' + v.split('\n').map(line => bodyPad + line).join('\n')
            }
            return padInner + JSON.stringify(k) + ': ' + formatDebugJson(v, indent + 2)
        })
        return '{\n' + parts.join(',\n') + '\n' + pad + '}'
    }
    return JSON.stringify(String(value))
}

function setDebugJson(elementId, value) {
    const el = document.getElementById(elementId)
    if (!el) return
    if (value === undefined || value === null) {
        el.textContent = '(not available for this response)'
        return
    }
    if (typeof value === 'string') {
        el.textContent = value
        return
    }
    el.textContent = formatDebugJson(value, 0)
}

function renderVerificationActivity(activity) {
    if (!activity) return
    setDebugJson('va-asked', activity.whatWeAsked)
    setDebugJson('va-received', activity.whatWeReceived)
    setDebugJson('va-steps', activity.howWeVerified)
    setDebugJson('va-checks', activity.whatWeVerified)
    setDebugJson('va-issuer', activity.issuerLegitimacy)
    setDebugJson('va-crypto', activity.encryption)
}

function showResponse(credentialResponse) {
    renderVerificationActivity(credentialResponse.verificationActivity)
    var modalTitle = document.getElementById('dcResultModalLabel')
    modalTitle.innerHTML = 'Returned Credentials (' + credentialResponse.pages.length + ')'
    var benchmarkDiv = document.getElementById('dcResultBenchmarks')
    var modalBody = document.getElementById('dcResultModal').querySelector('.list-group')
    modalBody.innerHTML = ''
    var benchmarks = collectZkpBenchmarks(credentialResponse)
    if (benchmarks.length > 0) {
        benchmarkDiv.hidden = false
        benchmarkDiv.innerHTML =
            '<div class="alert alert-warning mb-0">' +
            '<div class="fw-bold mb-2">ZKP benchmark</div>' +
            benchmarks.map(function (line) {
                return '<div class="font-monospace">' +
                    escapeHtml(line.value) +
                    '</div>'
            }).join('') +
            '</div>'
    } else {
        benchmarkDiv.hidden = true
        benchmarkDiv.innerHTML = ''
    }
    var pageNum = 0
    for (const page of credentialResponse.pages) {
        if (pageNum++ != 0) {
          modalBody.innerHTML += '<li class="list-group-item d-flex justify-content-between align-items-start"><div class="ms-2 me-auto"><div class="fw-bold">===========</div></div></li>'
        }
        for (const line of page.lines) {
            modalBody.innerHTML += formatResultLineListItem(line)
        }
    }
    var modal = new bootstrap.Modal(document.getElementById('dcResultModal'), {})
    modal.show()
}

function collectZkpBenchmarks(credentialResponse) {
    if (credentialResponse.benchmarks && credentialResponse.benchmarks.length > 0) {
        return credentialResponse.benchmarks
    }
    var benchmarks = []
    for (const page of credentialResponse.pages || []) {
        for (const line of page.lines || []) {
            if (isZkpBenchmarkLine(line.key)) {
                benchmarks.push(line)
            }
        }
    }
    return benchmarks
}

function isZkpBenchmarkLine(key) {
    return key === 'ZKP proof validation time'
}

function formatResultLineListItem(line) {
    const benchmark = isZkpBenchmarkLine(line.key)
    const itemClass = benchmark
        ? 'list-group-item list-group-item-warning d-flex justify-content-between align-items-start'
        : 'list-group-item d-flex justify-content-between align-items-start'
    const valueClass = benchmark ? 'font-monospace' : ''
    return '<li class="' + itemClass + '"><div class="ms-2 me-auto">' +
        '<div class="fw-bold">' + escapeHtml(line.key) + '</div>' +
        '<div class="' + valueClass + '">' + escapeHtml(line.value) + '</div></div></li>'
}

function escapeHtml(text) {
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
}

function openid4vpAuthenticateWithWallet() {
    console.log("Opening " + openid4vpUri)
    window.open(openid4vpUri)
}

async function callServer(command, params) {
    const response = await fetch(
        'verifier/' + command,
        {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(params)
        }
    )
    return await response.json()
}