"use strict";

const NUMBER_LOCALE = 'de-DE';

let ACCOUNTS_DIV = null;
let BALANCE_ID = null
let LOADED_TRANSACTIONS = null;
let MAIN_DIV = null;
let TRANSACTIONS_DIV = null;

function initialize() {
    MAIN_DIV = document.getElementById("main_content");
    TRANSACTIONS_DIV = document.createElement('div');
    ACCOUNTS_DIV = document.createElement('div');

    if (getCookie('balance_id')) {
        BALANCE_ID = getCookie('balance_id');
        fetchBalance();
        displayBalance();
    }
    else {
        window.location.replace('login.html');
    }
}

function selectLink(link_id) {
    const nav_links = document.querySelectorAll('.nav-link');
    nav_links.forEach(nav_link => {
        nav_link.classList.remove('link-selected');
    });
    document.getElementById(link_id).classList.add('link-selected');
}

function displayTransactions() {
    while (MAIN_DIV.firstChild)
        MAIN_DIV.removeChild(MAIN_DIV.lastChild);

    selectLink('transactions-link');

    const new_transaction_button = document.createElement('input');
    new_transaction_button.type = 'button';
    new_transaction_button.value = 'New Transaction';
    new_transaction_button.addEventListener('click', addNewTransaction);

    MAIN_DIV.appendChild(new_transaction_button);
    MAIN_DIV.appendChild(TRANSACTIONS_DIV);
}

function displayBalance() {
    while (MAIN_DIV.firstChild)
        MAIN_DIV.removeChild(MAIN_DIV.lastChild);
    selectLink('balance-link');
    MAIN_DIV.appendChild(ACCOUNTS_DIV);
}

function displayPopup(message) {
    const popup = document.createElement('div');
    const msg = document.createElement('span');
    
    popup.classList.add('popup-message');
    popup.classList.add('animated');

    setTimeout(function() {
        popup.classList.add('fadeOut');
        setTimeout(function() {
            document.body.removeChild(popup);
        }, 2000);
    }, 3000);

    if ('error' in message) {
        popup.classList.add('error-message');
        msg.innerHTML = '<b>ERROR:</b> '+message['error'];
    }
    else if ('message' in message) {
        msg.innerHTML = '<b>INFO:</b> '+message['message'];
    }

    popup.appendChild(msg);
    document.body.appendChild(popup);
}


function getCookie(name) {
    const document_cookie = document.cookie;
    let cookie_value = null;
    let cookies = document_cookie.split(';');

    cookies.forEach(cookie => {
        let cookie_name = cookie.split('=');
        if (cookie_name[0] == name) {
            cookie_value = cookie_name[1];
        }
    });

    return cookie_value;
}

function formatNumber(number) {
    if (number.toString().length == 0)
        return '';

    number = convertStringToFloat(number);
    return Intl.NumberFormat(NUMBER_LOCALE, {minimumFractionDigits: 2, maximumFractionDigits: 8}).format(number);
}

function validateFormattedNumber(number) {
    number = number.replaceAll(' ', '');
    if (number.match(/^-?(([1-9]\d{0,2}(\.\d{3})*)|([1-9]\d*|0))(,\d+)?$/)) {
        return true;
    }
    return false;
}

function convertStringToFloat(number) {
    number = number.toString().replaceAll(' ', '');
    if (validateFormattedNumber(number)) {
        number = number.replaceAll('.','').replaceAll(',','.');
    }
    if (number.length == 0) {
        return '';
    }
    return parseFloat(number);
}

function addNewTransaction() {
    if (TRANSACTIONS_DIV.querySelector('#new-transaction'))
        return;

    const table = TRANSACTIONS_DIV.querySelector('.transactions-rows-wrapper');
    const empty_transaction = {'id':'new-transaction','date':'', 'payee':'', 'entries': [
        {'account': '', 'amount':''},
        {'account': '', 'amount':''},
    ]};
    const transaction_row = drawTransactionRow(empty_transaction);
    table.insertBefore(transaction_row, table.children[1]);
    editTransactionRow(transaction_row);
}

function fetchBalance() {
    if (BALANCE_ID.length == 36) {
        updateTransactions();
    }
}

function createTransactionInput() {
    const input = document.createElement('input');

    input.classList.add('data-field');
    input.classList.add('transaction-input');
    input.addEventListener('input', (e) => {
        e.currentTarget.classList.remove('has-error');
    });

    return input;
}

function createTransactionTextInput() {
    const input = createTransactionInput();

    input.type = 'text';

    return input;
}

function createTransactionNumberInput() {
    const input = createTransactionTextInput();

    input.classList.add('entry-amount');
    input.addEventListener('focusout', (e) => {
        if (validateNumberInput(e.currentTarget))
            fillOutUnbalancedAmount(e.currentTarget.closest('.transaction-row'));
    });

    return input;
}

function createTransactionDateInput() {
    const input = createTransactionTextInput();

    input.classList.add('date-field');
    input.addEventListener('change', (e) => {
        validateDateInput(e.currentTarget);
    });

    return input;
}

function createTransactionButton(text) {
    const button = document.createElement('input');
    button.type = 'button';
    button.classList.add('transaction-button');
    button.value = text;

    return button;
}

function validateNumberInput(input_field) {
    input_field.classList.remove('has-error');

    if (validateFormattedNumber(input_field.value)) {
        input_field.value = formatNumber(input_field.value);
        return true;
    }
    else if (input_field.value.length > 0) {
        input_field.classList.add('has-error');
        return false;
    }
    return true;
}

function validateDateInput(input_field) {
    const date_format = /^(\d{4})(-)(\d{1,2})(-)(\d{1,2})$/;
    let date_string = input_field.value.trim();
    let date_is_valid = true;

    if(date_string.match(date_format)){      
        const date_part = date_string.split('-');
        if (date_part.length != 3)
            date_is_valid = false;

        const year = parseInt(date_part[0]);      
        const month= parseInt(date_part[1]);      
        const day = parseInt(date_part[2]);      
              
        const list_of_days = [31,28,31,30,31,30,31,31,30,31,30,31];      

        if (day < 1)
            date_is_valid = false;

        if (month >= 1 && month <= 12 && month != 2) {
            if (day>list_of_days[month-1])
                date_is_valid = false;
        }
        else if (month==2) {      
            let leap_year = false;

            if ( (!(year % 4) && year % 100) || !(year % 400))
                leap_year = true;

            if ((leap_year == false) && (day>=29))
                date_is_valid = false;
            else {
                if ((leap_year==true) && (day>29)){
                    date_is_valid = false;
                }
            }
        }
        else
            date_is_valid = false;
    }
    else {
        date_is_valid = false;
    }

    if (date_is_valid == false)
        input_field.classList.add('has-error');

    return date_is_valid;
}

function calculateTransactionBalance(transaction) {
    const amounts = transaction.querySelectorAll('.entry-amount');

    let unbalanced_amount = 0;

    amounts.forEach(amount => {
        if (validateFormattedNumber(amount.value)) {
            unbalanced_amount += convertStringToFloat(amount.value);
        }
    });

    return (unbalanced_amount *= -1);
}

function validateTransactionBalance(transaction) {
    const amounts = transaction.querySelectorAll('.entry-amount');
    let unbalanced_amount = 0;

    amounts.forEach(amount => {
        if (validateFormattedNumber(amount.value)) {
            unbalanced_amount += convertStringToFloat(amount.value);
        }
        else if (validateFormattedNumber(amount.placeholder)) {
            unbalanced_amount += convertStringToFloat(amount.placeholder);
        }
    });

    return unbalanced_amount;
}

function fillOutUnbalancedAmount(transaction) {
    console.log('fillOut called for');
    console.log(transaction);

    const unbalanced_amount = calculateTransactionBalance(transaction);
    console.log(unbalanced_amount);
    const amounts = transaction.querySelectorAll('.entry-amount');

    let first_free_field = null;

    amounts.forEach(amount => {
        amount.placeholder = '';
        if (amount.value.length == 0 && first_free_field == null) {
            first_free_field = amount;
        }
    });

    if (unbalanced_amount != 0) {
        if (first_free_field != null)
            first_free_field.placeholder = formatNumber(unbalanced_amount);
        else {
            addEntry(transaction);
            fillOutUnbalancedAmount(transaction);
        }
    }
}

function addEntry(transaction) {
    const parent = transaction.querySelector('.transaction-entries-wrapper');

    parent.insertBefore(drawEntryRow('',''), parent.lastChild);
}

function editTransaction(event) {
    editTransactionRow(event.currentTarget);
}

function editTransactionRow(transaction_row) {
    const inputs = TRANSACTIONS_DIV.querySelectorAll('input');
    inputs.forEach(input => {
        input.disabled = true;
    });

    transaction_row.querySelectorAll('input').forEach(input => {
        input.disabled = false;
    });

    TRANSACTIONS_DIV.querySelectorAll('.transaction-row').forEach(transaction => {
        transaction.classList.remove('edited-transaction');
    });
    transaction_row.classList.add('edited-transaction');
}

function extractDataFromTransactionRow(row) {
    const inputs = row.querySelectorAll('input');
    let values = []

    inputs.forEach(input => {
        if (input.type != 'button')
            values.push(input.value);
    });

    let transaction = {};
    if (row.id != 'new-transaction') {
        transaction['id'] = row.id;
    }
    transaction['balance_id'] = BALANCE_ID;
    transaction['date'] = values[0];
    transaction['payee'] = values[1];
    transaction['entries'] = [];

    for (let i=2; i!=values.length; i+=2) {
        let entry = {};
        entry['account'] = values[i];
        entry['amount'] = convertStringToFloat(values[i+1]);
        transaction['entries'].push(entry);
    }
    return transaction;
}

function validateTransaction(transaction) {
    const header = transaction.querySelector('.transaction-header-wrapper');
    const entries = transaction.querySelectorAll('.entry-row');
    const fields = header.querySelectorAll('.transaction-input');

    let transaction_valid = true;
    let first_invalid_field = null;

    function setAsInvalid(field) {
        if (first_invalid_field == null) {
            first_invalid_field = field;
            first_invalid_field.focus();
        }
        field.classList.add('has-error');
    }

    entries.forEach(entry => {
        const entry_fields = entry.querySelectorAll('.transaction-input');
        let all_fields_blank = true;

        if (entry_fields[0].value.trim().length > 0)
            all_fields_blank = false;
        if (entry_fields[1].value.trim().length > 0 ||
            entry_fields[1].placeholder.length > 0)
            all_fields_blank = false;

        if (!all_fields_blank) {
            console.log('not all blank by');
            console.log(entry);
            entry_fields.forEach(entry_field => {
                if (entry_field.classList.contains('entry-amount')) {
                    if (!validateNumberInput(entry_field)) {
                        transaction_valid = false;
                        setAsInvalid(entry_field);
                    }
                }
                else if (entry_field.value.trim().length == 0) {
                    transaction_valid = false;
                    setAsInvalid(entry_field);
                }
            });
        }
    });

    fields.forEach(field => {
        if (field.classList.contains('date-field')) {
            if (!validateDateInput(field)) {
                transaction_valid = false;
                setAsInvalid(field);
            }
        }
        if (field.value.trim().length == 0) {
            transaction_valid = false;
            setAsInvalid(field);
        }
    });

    if (validateTransactionBalance(transaction) != 0) {
        displayPopup({'error':'Transaction is not balanced.'});
        transaction_valid = false;
    }

    return transaction_valid;
}

function deleteTransaction(transaction) {
    console.log('deleting');
    console.log(transaction);
    sendDeleteTransactionRequest(extractDataFromTransactionRow(transaction));
}

function saveTransaction(transaction) {
    if (validateTransaction(transaction)) {
        sendTransaction(extractDataFromTransactionRow(transaction));
    }
}

function cancelEditing() {
    if (LOADED_TRANSACTIONS)
        drawTransactions(LOADED_TRANSACTIONS);
    else
        drawTransactions(null);
}

function removeEntry(event) {
    const entries_table = event.currentTarget.parentNode.parentNode.parentNode;
    const clicked_entry = event.currentTarget.parentNode.parentNode;
    const transaction = event.currentTarget.closest('.transaction-row');
    const entries_amount = entries_table.children.length;
    if (entries_amount > 3)
        entries_table.removeChild(clicked_entry);
    else {
        const inputs = clicked_entry.querySelectorAll('input');
        inputs.forEach(input => {
            if (input.type != 'button') {
                input.value = '';
                validateNumberInput(input);
            }
        });
    }
    fillOutUnbalancedAmount(transaction);
}

function drawEntryRow(account, amount) {
    const transaction_entries_row = document.createElement('div');
    const transaction_entries_account = document.createElement('div');
    const transaction_entries_amount = document.createElement('div');
    const transaction_entries_delete = document.createElement('div');

    const transaction_entries_account_input = createTransactionTextInput();
    const transaction_entries_amount_input = createTransactionNumberInput();
    const transaction_entries_delete_button = createTransactionButton('X');

    transaction_entries_row.classList.add('.entry-row');

    transaction_entries_account_input.value = account;
    transaction_entries_amount_input.value = formatNumber(amount);

    transaction_entries_delete_button.addEventListener('click', removeEntry);

    transaction_entries_account.appendChild(transaction_entries_account_input);
    transaction_entries_amount.appendChild(transaction_entries_amount_input);
    transaction_entries_delete.appendChild(transaction_entries_delete_button);

    transaction_entries_row.appendChild(transaction_entries_account);
    transaction_entries_row.appendChild(transaction_entries_amount);
    transaction_entries_row.appendChild(transaction_entries_delete);

    return transaction_entries_row;
}

function drawEmptyTransactionRow() {
    const transaction_row = document.createElement('div');
    transaction_row.classList.add('empty-transaction-row');
    transaction_row.classList.add('transaction-row');

    transaction_row.innerText = 'No transactions found.';
    return transaction_row;
}

function drawTransactionRow(transaction) {
    const transaction_row = document.createElement('div');
        const transaction_header = document.createElement('div');
            const transaction_header_date = document.createElement('div');
                const transaction_header_date_input = createTransactionDateInput();
            const transaction_header_payee = document.createElement('div');
                const transaction_header_payee_input = createTransactionTextInput();
            const transaction_header_buttons = document.createElement('div');

        const transaction_entries = document.createElement('div');

    transaction_row.id = transaction.id;
    transaction_row.addEventListener('mousedown', editTransaction);
    transaction_row.classList.add('transaction-row-wrapper');
    transaction_row.classList.add('transaction-row');

    transaction_header.classList.add('transaction-header-wrapper');
    transaction_entries.classList.add('transaction-entries-wrapper');

    transaction_row.appendChild(transaction_header);
    transaction_row.appendChild(transaction_entries);

    transaction_header.appendChild(transaction_header_date);
    transaction_header.appendChild(transaction_header_payee);
    transaction_header.appendChild(transaction_header_buttons);

    transaction_header_date_input.value = transaction.date;
    transaction_header_payee_input.value = transaction.payee;

    transaction_header_date.appendChild(transaction_header_date_input);
    transaction_header_payee.appendChild(transaction_header_payee_input);

    for (const entry of transaction.entries) {
        transaction_entries.appendChild(drawEntryRow(entry.account, entry.amount));
    }

    const transaction_entries_row = document.createElement('div');
    const transaction_entries_add_button = createTransactionButton('Add Entry');

    transaction_entries_add_button.addEventListener('click', (e) => { addEntry(e.currentTarget.closest('.transaction-row'));});

    transaction_entries_row.appendChild(transaction_entries_add_button);
    transaction_entries.appendChild(transaction_entries_row);

    const transaction_buttons_div = document.createElement('div');
    const transaction_save_button = createTransactionButton('Save'); 
    const transaction_cancel_button = createTransactionButton('Cancel'); 
    const transaction_delete_button = createTransactionButton('Delete'); 

    transaction_save_button.addEventListener('click', (e) => { saveTransaction(e.currentTarget.closest('.transaction-row')); });
    transaction_cancel_button.addEventListener('click', cancelEditing);
    transaction_delete_button.addEventListener('click', (e) => { deleteTransaction(e.currentTarget.closest('.transaction-row')); });

    transaction_buttons_div.classList.add('transaction-buttons-wrapper');
    transaction_buttons_div.appendChild(transaction_save_button);
    transaction_buttons_div.appendChild(transaction_cancel_button);
    transaction_buttons_div.appendChild(transaction_delete_button);

    transaction_row.appendChild(transaction_buttons_div);

    return transaction_row;
}

function drawTransactions(transactions) {
    const transactions_table = document.createElement('div');

    const table_header_row = document.createElement('div');
    const table_header_date = document.createElement('div');
    const table_header_payee = document.createElement('div');
    const table_header_account = document.createElement('div');
    const table_header_amount = document.createElement('div');
    const table_header_filler = document.createElement('div');

    table_header_date.innerText = 'Date';
    table_header_payee.innerText = 'Payee';
    table_header_account.innerText = 'Account';
    table_header_amount.innerText = 'Amount';

    table_header_amount.classList.add('transactions-amount-header');
    table_header_row.classList.add('transactions-header');

    transactions_table.classList.add('transactions-rows-wrapper');

    table_header_row.appendChild(table_header_date);
    table_header_row.appendChild(table_header_payee);
    table_header_row.appendChild(table_header_account);
    table_header_row.appendChild(table_header_amount);
    table_header_row.appendChild(table_header_filler);

    transactions_table.appendChild(table_header_row);

    if (transactions['transactions'].length > 0) {
        for (let transaction of transactions['transactions']) {
            transactions_table.appendChild(drawTransactionRow(transaction));
        }
    }
    else {
        transactions_table.appendChild(drawEmptyTransactionRow());
    }

    while (TRANSACTIONS_DIV.firstChild) {
        TRANSACTIONS_DIV.removeChild(TRANSACTIONS_DIV.lastChild);
    }

    TRANSACTIONS_DIV.classList.add('transactions-table');
    TRANSACTIONS_DIV.appendChild(transactions_table);
}

function send_transaction() {
    const payee = document.getElementById('payee').value;
    const date = document.getElementById('date').value;
    const entry1 = { 'account': document.getElementById('acc_1').value,
                     'amount': document.getElementById('am_1').value };
    const entry2 = { 'account': document.getElementById('acc_2').value,
                     'amount': document.getElementById('am_2').value };

    if (payee.length > 0 && date.length > 0
        && entry1['account'].length > 0 && entry1['amount'].length > 0
        && entry2['account'].length > 0 && entry2['amount'].length > 0) {
        const transaction = { 'balance_id' : BALANCE_ID,
                              'payee' : payee,
                              'date' : date,
                              'entries' : [ entry1, entry2 ] };
        sendTransaction(transaction);
    }
}

function getNewBalance() {
    sendRequest("GET", "http://localhost:5000/balance/new",
                null,
                (data) => {
                    BALANCE_ID = data['balance_id'];
                    updateContentWithBalance();
                    drawTransactions(null);
                }
    );
}

function sendTransaction(transaction) {
    sendRequest("POST", "http://localhost:5000/transaction/save",
                transaction,
                (data) => {
                    updateTransactions();
                }
    );
}

function updateTransactions() {
    sendRequest("GET", "http://localhost:5000/transaction/list/"+BALANCE_ID,
                null,
                (data) => {
                    LOADED_TRANSACTIONS = data;
                    drawTransactions(LOADED_TRANSACTIONS);
                    updateAccounts();
                }
    );
}

function updateAccounts() {
    sendRequest("POST", "http://localhost:5000/accounts",
                {'balance_id':BALANCE_ID},
                (data) => {
                    while (ACCOUNTS_DIV.firstChild)
                        ACCOUNTS_DIV.lastChild.remove();

                    ACCOUNTS_DIV.appendChild(ACCOUNTS.drawAll(data));
                }
    );
}

function sendDeleteTransactionRequest(transaction) {
    sendRequest("DELETE", "http://localhost:5000/transaction/delete",
                transaction,
                updateTransactions);
}

function sendRequest(request_type, address, content, call_back) {
    const xhttp = new XMLHttpRequest();

    xhttp.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) {
            const data = JSON.parse(this.responseText);
            if ('error' in data || 'message' in data) {
                displayPopup(data);
            }
            call_back(data);
        }
    };

    xhttp.open(request_type, address, true);
    if (content)
        xhttp.setRequestHeader("Content-Type", "application/json");
    xhttp.send(JSON.stringify(content));
}
