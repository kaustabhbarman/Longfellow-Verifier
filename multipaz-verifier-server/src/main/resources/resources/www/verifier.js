
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
            protocolDropdown.dispatchEvent(new Event('custom-protocol-changed'))


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
          const mdocSamples = dtwr.sampleRequests.filter(sr => sr.supportsMdoc)
          addTab(dtwr.documentDisplayName + " (mdoc)", "mdoc", dtwr.mdocDocType, mdocSamples, active)
          active = false
      }
      if (dtwr.vcVct != null) {
          const vcSamples = dtwr.sampleRequests.filter(sr => sr.supportsVc)
          addTab(
            dtwr.vcVct === 'urn:eudi:pid:1'
                ? "Personal ID (SD-JWT)"
                : dtwr.documentDisplayName + " (VC)",
            "vc",
            dtwr.vcVct,
            vcSamples,
            active
        )
          active = false
      }
    }
    initializeCustomDcqlBuilder()
    initializePidDcqlBuilder()
}


function initializeCustomDcqlBuilder() {
    const builder = document.getElementById('customDcqlBuilder')
    if (!builder) return

    const preview = document.getElementById('customDcqlPreview')
    const submit = document.getElementById('customDcqlSubmit')
    const message = document.getElementById('customDcqlMessage')
    const zkpCheckbox = document.getElementById('customMdocUseZkp')
    const protocolDropdown = document.getElementById('protocolDropdown')
    const claimCheckboxes = Array.from(
        builder.querySelectorAll('.custom-dcql-claim')
    )

    function selectedClaims() {
        return claimCheckboxes
            .filter(function (checkbox) { return checkbox.checked })
            .map(function (checkbox) { return checkbox.value })
    }

    function buildCustomDcql() {
        return {
            credentials: [{
                id: 'cred1',
                format: 'mso_mdoc',
                meta: {
                    doctype_value: 'org.iso.18013.5.1.mDL'
                },
                claims: selectedClaims().map(function (claim) {
                    return {
                        path: ['org.iso.18013.5.1', claim]
                    }
                })
            }]
        }
    }

    function updateCustomDcqlPreview() {
        const claims = selectedClaims()
        preview.value = JSON.stringify(buildCustomDcql(), null, 2)

        const zkpValid =
            !zkpCheckbox.checked ||
            (selectedProtocol === 'w3c_dc_mdoc_api' &&
             claims.includes('age_over_18'))

        if (claims.length === 0) {
            message.textContent = 'Select at least one attribute.'
        } else if (!isCustomDcqlProtocolSupported()) {
            message.textContent =
                'Choose the W3C mdoc API or a supported OpenID4VP protocol.'
        } else if (!zkpValid) {
            message.textContent =
                'ZKP requires the W3C mdoc API and age_over_18. Other attributes may also be selected.'
        } else {
            message.textContent =
                claims.length + ' attribute(s) selected.'
        }

        submit.disabled =
            claims.length === 0 ||
            !isCustomDcqlProtocolSupported() ||
            !zkpValid
    }

    function isCustomDcqlProtocolSupported() {
        return selectedProtocol === 'w3c_dc_mdoc_api' ||
               selectedProtocol === 'w3c_dc_openid4vp_24' ||
               selectedProtocol === 'w3c_dc_openid4vp_29'
    }

    zkpCheckbox.addEventListener('change', function () {
        if (zkpCheckbox.checked) {
            const ageClaim = claimCheckboxes.find(
                function (checkbox) { return checkbox.value === 'age_over_18' }
            )
            if (ageClaim) ageClaim.checked = true
        }
        updateCustomDcqlPreview()
    })

    claimCheckboxes.forEach(function (checkbox) {
        checkbox.addEventListener('change', function () {
            if (zkpCheckbox.checked &&
                checkbox.value === 'age_over_18' &&
                !checkbox.checked) {
                checkbox.checked = true
            }
            updateCustomDcqlPreview()
        })
    })


    // Refresh after the existing dropdown handler updates selectedProtocol.
    protocolDropdown.addEventListener('custom-protocol-changed', function () {
        updateCustomDcqlPreview()
    })

    submit.addEventListener('click', async function () {
        const claims = selectedClaims()

        if (claims.length === 0) {
            message.textContent = 'Select at least one attribute.'
            return
        }

        if (!isCustomDcqlProtocolSupported()) {
            message.textContent =
                'Select the W3C mdoc API or a supported OpenID4VP protocol first.'
            updateCustomDcqlPreview()
            return
        }

        if (zkpCheckbox.checked &&
            !(selectedProtocol === 'w3c_dc_mdoc_api' &&
              claims.includes('age_over_18'))) {
            message.textContent =
                'ZKP requires age_over_18 and the W3C mdoc API. Other attributes may also be selected.'
            updateCustomDcqlPreview()
            return
        }

        submit.disabled = true
        message.textContent = 'Creating request…'

        try {
            const signRequest =
                document.getElementById('openid4vp-sign-request-input').checked
            const encryptResponse =
                document.getElementById('openid4vp-encrypt-response-input').checked

            const requestPayload = {
                protocol: selectedProtocol,
                origin: location.origin,
                host: location.host,
                signRequest: signRequest,
                encryptResponse: encryptResponse
            }

            let response
            if (selectedProtocol === 'w3c_dc_mdoc_api') {
                response = await callServer('dcBegin', {
                    ...requestPayload,
                    format: 'mdoc',
                    docType: 'org.iso.18013.5.1.mDL',
                    requestId: '',
                    rawDcql: '',
                    multiDocumentRequestId: '',
                    customMdocClaims: claims,
                    customMdocUseZkp: zkpCheckbox.checked
                })
            } else {
                response = await callServer('dcBeginRawDcql', {
                    ...requestPayload,
                    rawDcql: JSON.stringify(buildCustomDcql())
                })
            }

            if (response.error != null) {
                throw new Error(response.error)
            }

            if (!response.sessionId || !response.dcRequestString ||
                !response.dcRequestProtocol) {
                throw new Error('The server returned an incomplete DC request.')
            }

            message.textContent =
                'Request sent to the wallet. Waiting for presentation…'

            dcRequestCredential(
                response.sessionId,
                response.dcRequestProtocol,
                JSON.parse(response.dcRequestString),
                response.dcRequestProtocol2,
                response.dcRequestString2 != null
                    ? JSON.parse(response.dcRequestString2)
                    : null,
                (text, type) => {
                    message.textContent = text
                    message.classList.toggle('text-danger', type === 'error')
                    message.classList.toggle('text-success', type === 'success')
                    message.classList.toggle('text-body-secondary', type === 'waiting')
                }
            )
        } catch (error) {
            message.textContent = 'Request failed: ' + error.message
            alert('Custom DCQL request failed: ' + error.message)
        }
    })

    updateCustomDcqlPreview()
}

function addTab(tabName, mdocOrVc, docTypeOrVct, sampleRequests, active) {
    var escapedDocTypeOrVct = docTypeOrVct.replace(/[^a-zA-Z0-9]/g, '_')
    var tabId = mdocOrVc + '-' + escapedDocTypeOrVct
    var activeStr = active ? "active" : ""
    const isPid = docTypeOrVct === 'eu.europa.ec.eudi.pid.1' ||
                  docTypeOrVct === 'urn:eudi:pid:1'

    $('<li class="nav-item" role="presentation">' +
        '<button class="nav-link ' + activeStr + '" data-bs-toggle="pill" id="pills-tab-' + tabId + '" data-bs-target="#pills-' + tabId + '" type="button" role="tab" aria-controls="pills-home" aria-selected="true">' +
        tabName +
        '</button>' +
        '</li>').appendTo('#pills-tab')

    var str = '<div class="tab-pane fade show ' + activeStr + '" '
    str += 'id="pills-' + tabId + '" role="tabpanel" '
    str += 'aria-labelledby="pills-tab-' + tabId + '" tabindex="0"> '

    if (!isPid && docTypeOrVct !== 'org.iso.18013.5.1.mDL') {
        str += '  <div class="d-grid gap-2 mx-auto"> '
        for (const sr of sampleRequests) {
            str += '    <button type="button" class="btn btn-primary btn-lg" '
            str += 'onclick="requestDocument(\'' + mdocOrVc + '\', \'' + docTypeOrVct + '\', \'' + sr.id + '\', null, null)" >'
            str += sr.displayName
            str += '    </button> '
        }
        str += '  </div> '
    }

    str += '</div> '
    $(str).appendTo('#pills-tabContent')

    $('#pills-tab-' + tabId).on('shown.bs.tab', function () {
        updateProtocolOptions(mdocOrVc, docTypeOrVct)

        const heading = document.getElementById('verifierHeading')
        const subtitle = document.getElementById('verifierSubtitle')
        const mdocBuilder = document.getElementById('customDcqlBuilder')
        const pidBuilder = document.getElementById('pidDcqlBuilder')

        if (isPid) {
            heading.innerHTML = '<i class="bi bi-person-vcard me-2 text-primary" aria-hidden="true"></i>Verify a Personal ID'

            subtitle.textContent = mdocOrVc === 'mdoc'
                ? 'Choose the PID mdoc data elements to request from the holder.'
                : 'Choose the PID SD-JWT VC claims to request from the holder.'

            const pidBuilderHeading = document.getElementById('pidBuilderHeading')
            const pidBuilderDescription = document.getElementById('pidBuilderDescription')

            if (mdocOrVc === 'mdoc') {
                pidBuilderHeading.textContent = 'Build a PID mdoc request'
                pidBuilderDescription.textContent =
                    'Select the PID mdoc data elements to request.'
            } else {
                pidBuilderHeading.textContent = 'Build a PID SD-JWT request'
                pidBuilderDescription.textContent =
                    'Select the PID SD-JWT VC claims to request.'
            }
        } else {
            heading.innerHTML = '<i class="bi bi-person-vcard me-2 text-primary" aria-hidden="true"></i>Verify a mobile driving licence'
            subtitle.textContent = 'Choose the mDL attributes to request and optionally verify age with a privacy-preserving proof.'
        }

        if (mdocBuilder) mdocBuilder.hidden = isPid
        if (pidBuilder) pidBuilder.hidden = !isPid
    })
}

function updateProtocolOptions(mdocOrVc, docTypeOrVct) {
    const protocolDropdown = document.getElementById('protocolDropdown')
    const isVc = mdocOrVc === 'vc'
    const isPid = docTypeOrVct === 'eu.europa.ec.eudi.pid.1' ||
                  docTypeOrVct === 'urn:eudi:pid:1'

    const vcProtocols = [
        'w3c_dc_openid4vp_24',
        'w3c_dc_openid4vp_29',
        'uri_scheme_openid4vp_29'
    ]

    const pidProtocols = isVc
        ? ['w3c_dc_openid4vp_24', 'w3c_dc_openid4vp_29']
        : ['w3c_dc_mdoc_api', 'w3c_dc_openid4vp_24', 'w3c_dc_openid4vp_29']

    const options = Array.from(
        document.querySelectorAll('.dropdown-menu a.dropdown-item')
    )

    options.forEach(option => {
        const value = option.getAttribute('value')
        const supported = isPid
            ? pidProtocols.includes(value)
            : (!isVc || vcProtocols.includes(value))
        option.parentElement.hidden = !supported
    })

    const isSupported = protocol =>
        isPid
            ? pidProtocols.includes(protocol)
            : (!isVc || vcProtocols.includes(protocol))

    if (!isSupported(preferredProtocol)) {
        selectedProtocol = isPid && !isVc
            ? 'w3c_dc_mdoc_api'
            : 'w3c_dc_openid4vp_24'
    } else {
        selectedProtocol = preferredProtocol
    }

    const selectedOption = options.find(
        option => option.getAttribute('value') === selectedProtocol
    )

    if (selectedOption) {
        protocolDropdown.innerHTML = selectedOption.innerHTML
    }

    const openid4vpSignRequestCheckbox =
        document.getElementById("openid4vp-sign-request")
    openid4vpSignRequestCheckbox.hidden = (
        selectedProtocol !== 'w3c_dc_openid4vp_24' &&
        selectedProtocol !== 'w3c_dc_openid4vp_29' &&
        selectedProtocol !== 'w3c_dc_openid4vp_29_and_mdoc_api' &&
        selectedProtocol !== 'w3c_dc_openid4vp_24_and_mdoc_api' &&
        selectedProtocol !== 'w3c_dc_mdoc_api_and_openid4vp_29' &&
        selectedProtocol !== 'w3c_dc_mdoc_api_and_openid4vp_24'
    )

    const openid4vpEncryptResponseCheckbox =
        document.getElementById("openid4vp-encrypt-response")
    openid4vpEncryptResponseCheckbox.hidden = (
        selectedProtocol !== 'w3c_dc_openid4vp_24' &&
        selectedProtocol !== 'w3c_dc_openid4vp_29' &&
        selectedProtocol !== 'w3c_dc_openid4vp_29_and_mdoc_api' &&
        selectedProtocol !== 'w3c_dc_openid4vp_24_and_mdoc_api' &&
        selectedProtocol !== 'w3c_dc_mdoc_api_and_openid4vp_29' &&
        selectedProtocol !== 'w3c_dc_mdoc_api_and_openid4vp_24' &&
        selectedProtocol !== 'uri_scheme_openid4vp_29'
    )

    const scheme = document.getElementById("scheme-form")
    scheme.hidden = selectedProtocol !== 'uri_scheme_openid4vp_29'
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


function initializePidDcqlBuilder() {
    const builder = document.getElementById('pidDcqlBuilder')
    if (!builder) return

    const preview = document.getElementById('pidDcqlPreview')
    const submit = document.getElementById('pidDcqlSubmit')
    const message = document.getElementById('pidDcqlMessage')
    const protocolDropdown = document.getElementById('protocolDropdown')
    const claimCheckboxes = Array.from(
        builder.querySelectorAll('.pid-dcql-claim')
    )

    function activeCredential() {
        const activeTab = document.querySelector('#pills-tab .nav-link.active')
        if (!activeTab) return null

        const id = activeTab.id
        if (id === 'pills-tab-mdoc-eu_europa_ec_eudi_pid_1') {
            return { format: 'mdoc', identifier: 'eu.europa.ec.eudi.pid.1' }
        }
        if (id === 'pills-tab-vc-urn_eudi_pid_1') {
            return { format: 'vc', identifier: 'urn:eudi:pid:1' }
        }
        return null
    }

    function selectedClaims() {
        return claimCheckboxes.filter(checkbox => checkbox.checked)
    }

    function selectedVcPaths() {
        const paths = selectedClaims()
            .filter(checkbox => checkbox.dataset.vcPath)
            .map(checkbox => JSON.parse(checkbox.dataset.vcPath))

        return paths.filter(path => !paths.some(other =>
            other.length < path.length &&
            other.every((part, index) => part === path[index])
        ))
    }

    function buildPidDcql(credential) {
        const claims = credential.format === 'mdoc'
            ? selectedClaims().map(checkbox => ({
                path: ['eu.europa.ec.eudi.pid.1', checkbox.dataset.mdocClaim]
            }))
            : selectedVcPaths().map(path => ({ path }))

        return {
            credentials: [{
                id: 'pid',
                format: credential.format === 'mdoc' ? 'mso_mdoc' : 'dc+sd-jwt',
                meta: credential.format === 'mdoc'
                    ? { doctype_value: 'eu.europa.ec.eudi.pid.1' }
                    : { vct_values: ['urn:eudi:pid:1'] },
                claims
            }]
        }
    }

    function protocolSupported(credential) {
        if (!credential) return false
        if (credential.format === 'mdoc' &&
            selectedProtocol === 'w3c_dc_mdoc_api') return true

        return selectedProtocol === 'w3c_dc_openid4vp_24' ||
               selectedProtocol === 'w3c_dc_openid4vp_29'
    }

    function updatePreview() {
        const credential = activeCredential()
        const claims = selectedClaims()

        preview.value = credential
            ? JSON.stringify(buildPidDcql(credential), null, 2)
            : ''

        if (!credential) {
            message.textContent = 'Select a PID tab to build a request.'
        } else if (claims.length === 0) {
            message.textContent = 'Select at least one PID attribute.'
        } else if (!protocolSupported(credential)) {
            message.textContent = credential.format === 'vc'
                ? 'Choose OpenID4VP Draft 24 or OpenID4VP 1.0 for PID SD-JWT VC.'
                : 'Choose the W3C mdoc API or a supported OpenID4VP protocol.'
        } else {
            message.textContent = claims.length + ' PID attribute(s) selected.'
        }

        submit.disabled =
            !credential || claims.length === 0 || !protocolSupported(credential)
    }

    claimCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', updatePreview)
    })

    protocolDropdown.addEventListener('custom-protocol-changed', updatePreview)

    document.querySelectorAll('#pills-tab .nav-link').forEach(tab => {
        tab.addEventListener('shown.bs.tab', updatePreview)
    })

    submit.addEventListener('click', async function () {
        const credential = activeCredential()
        const claims = selectedClaims()

        if (!credential || claims.length === 0 || !protocolSupported(credential)) {
            updatePreview()
            return
        }

        submit.disabled = true
        message.textContent = 'Creating PID request…'

        try {
            const requestPayload = {
                protocol: selectedProtocol,
                origin: location.origin,
                host: location.host,
                signRequest: document.getElementById(
                    'openid4vp-sign-request-input'
                ).checked,
                encryptResponse: document.getElementById(
                    'openid4vp-encrypt-response-input'
                ).checked
            }

            const dcql = buildPidDcql(credential)
            let response

            if (credential.format === 'mdoc' &&
                selectedProtocol === 'w3c_dc_mdoc_api') {
                response = await callServer('dcBegin', {
                    ...requestPayload,
                    format: 'mdoc',
                    docType: 'eu.europa.ec.eudi.pid.1',
                    requestId: '',
                    rawDcql: '',
                    multiDocumentRequestId: '',
                    customMdocClaims: claims.map(
                        checkbox => checkbox.dataset.mdocClaim
                    ),
                    customMdocUseZkp: false
                })
            } else {
                response = await callServer('dcBeginRawDcql', {
                    ...requestPayload,
                    rawDcql: JSON.stringify(dcql)
                })
            }

            if (response.error != null) {
                throw new Error(response.error)
            }

            if (!response.sessionId || !response.dcRequestString ||
                !response.dcRequestProtocol) {
                throw new Error('The server returned an incomplete PID request.')
            }

            message.textContent =
                'PID request sent to the wallet. Waiting for presentation…'

            dcRequestCredential(
                response.sessionId,
                response.dcRequestProtocol,
                JSON.parse(response.dcRequestString),
                response.dcRequestProtocol2,
                response.dcRequestString2 != null
                    ? JSON.parse(response.dcRequestString2)
                    : null,
                (text, type) => {
                    message.textContent = text
                    message.classList.toggle('text-danger', type === 'error')
                    message.classList.toggle('text-success', type === 'success')
                    message.classList.toggle('text-body-secondary', type === 'waiting')
                }
            )
        } catch (error) {
            message.textContent = 'PID request failed: ' + error.message
            message.classList.add('text-danger')
        } finally {
            updatePreview()
        }
    })

    updatePreview()
}

async function dcRequestCredential(
    sessionId,
    dcRequestProtocol,
    dcRequest,
    dcRequestProtocol2,
    dcRequest2,
    onStatus
) {
    function updateStatus(text, type) {
        if (typeof onStatus === 'function') {
            onStatus(text, type)
        }
    }

    if (!navigator.credentials || !navigator.credentials.get) {
        const error =
            'Digital Credentials API is unavailable. Enable it in Chrome at chrome://flags/#web-identity-digital-credentials.'
        updateStatus(error, 'error')
        alert(error)
        return
    }

    try {
        console.log('protocol: ', dcRequestProtocol)
        console.log('request: ', dcRequest)

        const requests = [{
            protocol: dcRequestProtocol,
            data: dcRequest
        }]

        if (dcRequestProtocol2 != null) {
            console.log('protocol2: ', dcRequestProtocol2)
            console.log('request2: ', dcRequest2)

            requests.push({
                protocol: dcRequestProtocol2,
                data: dcRequest2
            })
        }

        updateStatus('Waiting for wallet presentation…', 'waiting')

        const credentialResponse = await navigator.credentials.get({
            digital: {
                requests: requests
            },
            mediation: 'required'
        })

        if (!credentialResponse) {
            throw new Error('The wallet returned no credential response.')
        }

        console.log('credentialResponse ', credentialResponse)

        updateStatus('Presentation received. Verifying…', 'waiting')

        await dcProcessResponse(sessionId, credentialResponse)

        updateStatus('Presentation processed. See the results panel.', 'success')
    } catch (err) {
        const errorMessage = err && err.message
            ? err.message
            : String(err)

        updateStatus('Presentation failed: ' + errorMessage, 'error')
        alert(errorMessage)
    }
}

async function dcProcessResponse(sessionId, credentialResponse) {
    const dataStr = typeof credentialResponse.data === 'string'
        ? credentialResponse.data
        : JSON.stringify(credentialResponse.data)

    const response = await callServer('dcGetData', {
        sessionId: sessionId,
        credentialProtocol: credentialResponse.protocol,
        credentialResponse: dataStr
    })

    if (response && response.error != null) {
        throw new Error(response.error)
    }

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

    var title = document.getElementById('dcResultModalLabel')
    var status = document.getElementById('dcResultStatus')
    var empty = document.getElementById('dcResultEmpty')
    var benchmarkDiv = document.getElementById('dcResultBenchmarks')
    var resultList = document.getElementById('dcResultList')
    var pages = credentialResponse.pages || []

    title.textContent = 'Returned Credentials (' + pages.length + ')'
    empty.hidden = pages.length > 0
    resultList.innerHTML = ''

    const resultLines = pages.flatMap(function (page) {
        return page.lines || []
    })

    const hasExplicitFailure = resultLines.some(function (line) {
        const key = String(line.key || '').toLowerCase()
        const value = String(line.value || '').toLowerCase()

        if (key === 'zkp proof validation time') {
            return value.includes('failed') ||
                value.includes('not measured (zk verification did not complete)')
        }

        return (
            (key === 'device response' &&
                value.startsWith('error verifying')) ||
            (key === 'zk verification' &&
                value.includes('failed')) ||
            (key === 'zk proof' &&
                value.includes('not found')) ||
            (key === 'document' &&
                value.includes('verification failed')) ||
            (key === 'key binding' &&
                value.includes('error validating')) ||
            (key === 'error' &&
                (value.includes('error validating signature') ||
                value.includes('cnf')))
        )
    })

    const hasTrustWarning = resultLines.some(function (line) {
        const key = String(line.key || '').toLowerCase()
        const value = String(line.value || '').toLowerCase()

        return key === 'issuer' &&
            (
                value.includes('not in trust list') ||
                value.includes('not signed by issuer') ||
                value.includes('no msox5chain') ||
                value.includes('no issuer certificates')
            )
    })

    const hasMissingIssuerCertificate = resultLines.some(function (line) {
        const key = String(line.key || '').toLowerCase()
        const value = String(line.value || '').toLowerCase()

        return key === 'error' &&
            value.includes('issuer-signed key not in')
    })

    if (pages.length === 0) {
        status.textContent = 'No results'
        status.className = 'badge text-bg-secondary'
    } else if (hasExplicitFailure) {
        status.textContent = 'Verification issue'
        status.className = 'badge text-bg-danger'
    } else if (hasTrustWarning || hasMissingIssuerCertificate) {
        status.textContent = 'Trust warning'
        status.className = 'badge text-bg-warning'
    } else {
        status.textContent = 'Results received'
        status.className = 'badge text-bg-secondary'
    }

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
    for (const page of pages) {
        if (pageNum++ !== 0) {
            resultList.innerHTML +=
                '<li class="list-group-item"><div class="fw-bold">Next document</div></li>'
        }
        for (const line of (page.lines || [])) {
            resultList.innerHTML += formatResultLineListItem(line)
        }
    }
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
