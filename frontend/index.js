"use strict";

const main_div = document.getElementById("main_content");
const transactions_div = document.getElementById("transactions_div");
const accounts_div = document.getElementById("accounts_div");

let BALANCE_ID = null
let DISPLAYED_TRANSACTIONS = null;
let EDITED_TRANSACTION = null;
let LOADED_TRANSACTIONS = null;

if (BALANCE_ID == null) {
    let content = '';
    content += '<input type="button" onclick="getNewBalance()" value="Create New Balance" /><br /><br />';
    content += '<input type="text" id="balance_id_input" placeholder="Balance ID" />';
    content += '<input type="button" onclick="fetchBalance()" value="Load Balance" /><br />';

    main_div.innerHTML = content;
}

function parseAccounts(accounts) {
    let parsed_accounts = [];

    accounts.forEach(account => {
        let sub_accounts = account['name'].split(':');

        addAccount(sub_accounts, parseFloat(account['balance']), parsed_accounts);
    });

    return parsed_accounts;
}

function addAccount(accounts, balance, array) {

    let account = {};
    let account_found = false;
    
    account['name'] = accounts.shift();
    account['balance'] = balance;
    account['sub_accounts'] = [];

    array.forEach(element => {
        if (element['name'] == account['name']) {
            account_found = true;
            element['balance'] += account['balance'];
            addAccount(accounts, balance, element['sub_accounts']);
        }
    });

    if (!account_found) {
        array.push(account);
        if (accounts.length > 0)
            addAccount(accounts, balance, account['sub_accounts']);
    }
}

function fetchBalance() {
    BALANCE_ID = document.getElementById('balance_id_input').value;
    if (BALANCE_ID.length == 36) {
        updateContentWithBalance();
        updateTransactions();
    }
}

function traverseAccounts(account, depth, parent) {
    const account_row = drawAccountRow(account['name'], account['balance']);
    account_row.style.paddingLeft = depth * 20;
    account_row.classList.add('account-depth-'+depth);
    parent.appendChild(account_row);

    if (account['sub_accounts'].length > 0) {
        account['sub_accounts'].forEach(sub_account => {
            traverseAccounts(sub_account, depth+1, parent);
        });
    }
}

function drawAccountRow(account_name, balance, parent) {
    const account_row = document.createElement('div');
    const account_row_name = document.createElement('div');
    const account_row_balance = document.createElement('div');

    account_row_balance.classList.add('entry-amount');
    account_row.classList.add('account-row');
    account_row_name.innerText = account_name;
    account_row_balance.innerText = balance;

    account_row.appendChild(account_row_name);
    account_row.appendChild(account_row_balance);
    
    return account_row;
}

function drawAccounts(accounts) {
    let content = '';
    let depth = 0;
    accounts = parseAccounts(accounts['accounts']);

    while (accounts_div.firstChild) {
        accounts_div.removeChild(accounts_div.lastChild);
    }

    const accounts_table = document.createElement('div');
    accounts_table.classList.add('accounts-wrapper');

    accounts.forEach(account => {
        traverseAccounts(account, 0, accounts_table);
    });

    console.log(accounts_table);

    accounts_div.appendChild(accounts_table);
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

function updateContentWithBalance() {
    let conent = '';
    content = '';
    content += 'Balance ID fetched.<br />';
    content += BALANCE_ID;

    content += '<br />' +
            '<input id="payee" type="text" placeholder="Date" value="Payee" /><br />' +
            '<input id="date" type="text" placeholder="Payee" value="2020-05-01" /><br />' +
            '<input id="acc_1" type="text" placeholder="Account 1" value="Debit" />' +
            '<input id="am_1" type="text" placeholder="Amount 1" value="5" /><br />' +
            '<input id="acc_2" type="text" placeholder="Account 2" value="Credit" />' +
            '<input id="am_2" type="text" placeholder="Amount 2" value="-5" /><br />' +
            '<input type="button" onclick="send_transaction()" value="Send Transaction"></input><br />';

    main_div.innerHTML = content;
}

function createTransactionInput() {
    const input = document.createElement('input');
    input.classList.add('transaction-input');
    // input.disabled = true;

    return input;
}

function createTransactionButton(text) {
    const button = document.createElement('button');
    button.classList.add('transaction-button');
    button.innerText = text;

    return button;
}

function addEntry(event) {
    const parent = event.currentTarget.parentNode.parentNode;
    const last_element = event.currentTarget.parentNode;

    parent.insertBefore(drawEntryRow('',''), last_element);
}

function editTransaction(event) {
    EDITED_TRANSACTION = event.currentTarget;

    const inputs = transactions_div.querySelectorAll('input');
    inputs.forEach(input => {
        input.disabled = true;
    });

    EDITED_TRANSACTION.querySelectorAll('input').forEach(input => {
        input.disabled = false;
    });

    DISPLAYED_TRANSACTIONS.forEach(transaction => {
        transaction.classList.remove('edited-transaction');
    });
    EDITED_TRANSACTION.classList.add('edited-transaction');
}

function createTransactionFromInputs(row) {
    const inputs = row.querySelectorAll('input');
    let values = []

    inputs.forEach(input => {
        values.push(input.value);
    });

    let transaction = {};
    transaction['id'] = row.id;
    transaction['balance_id'] = BALANCE_ID;
    transaction['date'] = values[0];
    transaction['payee'] = values[1];
    transaction['entries'] = [];

    for (let i=2; i!=values.length; i+=2) {
        let entry = {};
        entry['account'] = values[i];
        entry['amount'] = values[i+1];
        transaction['entries'].push(entry);
    }
    return transaction;
}

function saveTransaction(event) {
    sendTransaction(createTransactionFromInputs(event.currentTarget.parentNode.parentNode));
}

function cancelEditing() {
    if (LOADED_TRANSACTIONS)
        drawTransactions(LOADED_TRANSACTIONS);
}

function removeEntry(event) {
    const entries_table = event.currentTarget.parentNode.parentNode.parentNode;
    const clicked_entry = event.currentTarget.parentNode.parentNode;
    const entries_amount = entries_table.children.length;
    if (entries_amount > 3)
        entries_table.removeChild(clicked_entry);
    else {
        const inputs = clicked_entry.querySelectorAll('input');
        inputs.forEach(input => {
            input.value = '';
        });
    }
}

function drawEntryRow(account, amount) {
    const transaction_entries_row = document.createElement('div');
    const transaction_entries_account = document.createElement('div');
    const transaction_entries_amount = document.createElement('div');
    const transaction_entries_delete = document.createElement('div');

    const transaction_entries_account_input = createTransactionInput();
    const transaction_entries_amount_input = createTransactionInput();
    const transaction_entries_delete_button = createTransactionButton('X');

    transaction_entries_account_input.value = account;
    transaction_entries_amount_input.value = amount;
    transaction_entries_amount_input.classList.add('entry-amount');

    transaction_entries_delete_button.addEventListener('click', removeEntry);

    transaction_entries_account.appendChild(transaction_entries_account_input);
    transaction_entries_amount.appendChild(transaction_entries_amount_input);
    transaction_entries_delete.appendChild(transaction_entries_delete_button);

    transaction_entries_row.appendChild(transaction_entries_account);
    transaction_entries_row.appendChild(transaction_entries_amount);
    transaction_entries_row.appendChild(transaction_entries_delete);

    return transaction_entries_row;
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

    for (let transaction of transactions['transactions']) {
        const transaction_row = document.createElement('div');
        const transaction_header = document.createElement('div');
        const transaction_entries = document.createElement('div');

        const transaction_header_date = document.createElement('div');
        const transaction_header_payee = document.createElement('div');
        const transaction_header_buttons = document.createElement('div');

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

        const transaction_header_date_input = createTransactionInput();
        const transaction_header_payee_input = createTransactionInput();
        transaction_header_date_input.value = transaction.date;
        transaction_header_payee_input.value = transaction.payee;

        transaction_header_date.appendChild(transaction_header_date_input);
        transaction_header_payee.appendChild(transaction_header_payee_input);

        for (const entry of transaction.entries) {
            transaction_entries.appendChild(drawEntryRow(entry.account, entry.amount));
        }

        const transaction_entries_row = document.createElement('div');
        const transaction_entries_add_button = createTransactionButton('Add Entry');

        transaction_entries_add_button.addEventListener('click', addEntry);

        transaction_entries_row.appendChild(transaction_entries_add_button);
        transaction_entries.appendChild(transaction_entries_row);

        const transaction_buttons_div = document.createElement('div');
        const transaction_save_button = createTransactionButton('Save'); 
        const transaction_cancel_button = createTransactionButton('Cancel'); 
        const transaction_delete_button = createTransactionButton('Delete'); 

        transaction_save_button.addEventListener('click', saveTransaction);
        transaction_cancel_button.addEventListener('click', cancelEditing);
        transaction_delete_button.addEventListener('click', deleteTransaction);

        transaction_buttons_div.classList.add('transaction-buttons-wrapper');
        transaction_buttons_div.appendChild(transaction_save_button);
        transaction_buttons_div.appendChild(transaction_cancel_button);
        transaction_buttons_div.appendChild(transaction_delete_button);

        transaction_row.appendChild(transaction_buttons_div);
        transactions_table.appendChild(transaction_row);
    }

    while (transactions_div.firstChild) {
        transactions_div.removeChild(transactions_div.lastChild);
    }

    transactions_div.classList.add('transactions-table');
    transactions_div.appendChild(transactions_table);

    DISPLAYED_TRANSACTIONS = transactions_div.querySelectorAll(".transaction-row");
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
    const xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) {
            const data = JSON.parse(this.responseText);
            if ('error' in data || 'message' in data) {
                displayPopup(data);
            }

            BALANCE_ID = data['balance_id'];
            updateContentWithBalance();
        }
    };

    xhttp.open("GET", "http://localhost:5000/balance/new", true);
    xhttp.send();
}

function sendTransaction(trans) {
    const xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) {
            const data = JSON.parse(this.responseText);
            if ('error' in data || 'message' in data) {
                displayPopup(data);
            }
            updateTransactions();
        }
    };

    xhttp.open("POST", "http://localhost:5000/transaction/save", true);
    xhttp.setRequestHeader("Content-Type", "application/json");
    xhttp.send(JSON.stringify(trans));
}

function updateTransactions() {
    const xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) {
            const data = JSON.parse(this.responseText);
            if ('error' in data || 'message' in data) {
                displayPopup(data);
            }
            else {
                LOADED_TRANSACTIONS = JSON.parse(this.responseText);
                drawTransactions(LOADED_TRANSACTIONS);
                updateAccounts();
            }
        }
    };

    xhttp.open("GET", "http://localhost:5000/transaction/list/"+BALANCE_ID, true);
    xhttp.send();
}

function updateAccounts() {
    const xhttp = new XMLHttpRequest();

    xhttp.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) {
            const data = JSON.parse(this.responseText);
            if ('error' in data || 'message' in data) {
                displayPopup(data);
            }
            else {
                drawAccounts(data);
            }
        }
    };

    let balance = {};
    balance['balance_id'] = BALANCE_ID;

    xhttp.open("POST", "http://localhost:5000/accounts", true);
    xhttp.setRequestHeader("Content-Type", "application/json");
    xhttp.send(JSON.stringify(balance));
}

function deleteTransaction() {
    const trans = createTransactionFromInputs(EDITED_TRANSACTION);
    const xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) {
            const data = JSON.parse(this.responseText);
            if ('error' in data || 'message' in data) {
                displayPopup(data);
            }
            updateTransactions();
        }
    };

    xhttp.open("DELETE", "http://localhost:5000/transaction/delete", true);
    xhttp.setRequestHeader("Content-Type", "application/json");
    xhttp.send(JSON.stringify(trans));
}
