let BALANCE_ID = null
const main_div = document.getElementById("main_content");
const transactions_div = document.getElementById("transactions_div");

let EDITED_TRANSACTION = null;

if (BALANCE_ID == null) {
    let content = '';
    content += '<input type="button" onclick="getNewBalance()" value="Create New Balance" /><br /><br />';
    content += '<input type="text" id="balance_id_input" placeholder="Balance ID" />';
    content += '<input type="button" onclick="fetchBalance()" value="Load Balance" /><br />';

    main_div.innerHTML = content;
}

function fetchBalance() {
    BALANCE_ID = document.getElementById('balance_id_input').value;
    if (BALANCE_ID.length == 36) {
        updateContentWithBalance();
        updateTransactions();
    }
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

    return input;
}

function editTransaction(event) {
    // TODO
}

function drawTransactions(transactions) {
    const transactions_table = document.createElement('div');

    const table_header_row = document.createElement('div');
    const table_header_date = document.createElement('div');
    const table_header_payee = document.createElement('div');
    const table_header_account = document.createElement('div');
    const table_header_amount = document.createElement('div');

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

    transactions_table.appendChild(table_header_row);

    for (let transaction of transactions['transactions']) {
        const transaction_row = document.createElement('div');
        const transaction_header = document.createElement('div');
        const transaction_entries = document.createElement('div');

        const transaction_header_date = document.createElement('div');
        const transaction_header_payee = document.createElement('div');

        transaction_row.id = transaction.id;
        transaction_row.addEventListener('click', editTransaction);
        transaction_row.classList.add('transaction-row-wrapper');
        transaction_header.classList.add('transaction-header-wrapper');
        transaction_entries.classList.add('transaction-entries-wrapper');

        transaction_row.appendChild(transaction_header);
        transaction_row.appendChild(transaction_entries);

        transaction_header.appendChild(transaction_header_date);
        transaction_header.appendChild(transaction_header_payee);

        const transaction_header_date_input = createTransactionInput();
        const transaction_header_payee_input = createTransactionInput();

        transaction_header_date_input.value = transaction.date;
        transaction_header_payee_input.value = transaction.payee;

        transaction_header_date.appendChild(transaction_header_date_input);
        transaction_header_payee.appendChild(transaction_header_payee_input);

        for (const entry of transaction.entries) {
            const transaction_entries_row = document.createElement('div');
            const transaction_entries_account = document.createElement('div');
            const transaction_entries_amount = document.createElement('div');

            const transaction_entries_account_input = createTransactionInput();
            const transaction_entries_amount_input = createTransactionInput();

            transaction_entries_account_input.value = entry.account;
            transaction_entries_amount_input.value = entry.amount.toFixed(2);
            transaction_entries_amount_input.classList.add('entry-amount');

            transaction_entries_account.appendChild(transaction_entries_account_input);
            transaction_entries_amount.appendChild(transaction_entries_amount_input);

            transaction_entries_row.appendChild(transaction_entries_account);
            transaction_entries_row.appendChild(transaction_entries_amount);

            transaction_entries.appendChild(transaction_entries_row);
        }

        transactions_table.appendChild(transaction_row);
    }

    while (transactions_div.firstChild) {
        transactions_div.removeChild(transactions_div.lastChild);
    }

    transactions_div.classList.add('transactions-table');
    transactions_div.appendChild(transactions_table);
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
            if ('message' in data) {
                console.log(data['message'])
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
            if ('message' in data) {
                console.log(data['message'])
            }
            updateTransactions();
        }
    };

    xhttp.open("POST", "http://localhost:5000/transaction/new", true);
    xhttp.setRequestHeader("Content-Type", "application/json");
    xhttp.send(JSON.stringify(trans));
}

function updateTransactions() {
    const xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) {
            const data = JSON.parse(this.responseText);
            if ('message' in data) {
                console.log(data['message'])
            }
            else
                drawTransactions(JSON.parse(this.responseText));
        }
    };

    xhttp.open("GET", "http://localhost:5000/transaction/list/"+BALANCE_ID, true);
    xhttp.send();
}
