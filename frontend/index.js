let BALANCE_ID = null
const main_div = document.getElementById("main_content");
const transactions_div = document.getElementById("transactions_div");

if (BALANCE_ID == null) {
    let content = '';
    content += '<input type="button" onclick="getNewBalance()" value="Create New Balance" /><br /><br />';
    content += '<input type="text" id="balance_id_input" placeholder="Balance ID" />';
    content += '<input type="button" onclick="fetchBalance()" value="Load Balance" /><br />';

    main_div.innerHTML = content;
}

function fetchBalance() {
    BALANCE_ID = document.getElementById('balance_id_input').value;
    updateContentWithBalance();
    updateTransactions();
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

function drawTransactions(transactions) {
    let content = '';

    content += '<table>';

    for (let transaction of transactions['transactions']) {
        console.log(transaction);
        content += '<tr>';
        content += '<td>'+transaction.date+'</td>';
        content += '<td>'+transaction.payee+'</td>';
        content += '<td><table>';
        for (let entry of transaction.entries) {
            content += '<tr>';
            content += '<td>' + entry.account + '</td>';
            content += '<td>' + entry.amount.toLocaleString(undefined, {minimumFractionDigits: 2}) + '</td>';
            content += '</tr>';
        }
        content += '</table></td>';
        content += '</tr>';
    }

    content += '</table>';
    transactions_div.innerHTML = content;
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
        console.log(transaction);
        sendTransaction(transaction);
    }
}

/*
getParameters = () => {
    address = window.location.search;
    param_list = new URLSearchParams(address);

    let map = new Map();

    param_list.forEach((value, key) => { map.set(key, value); })

    return map;
}

const params = getParameters();

if (params) {
    console.log(params.get('balance_id'));
    main_div.innerHTML = '';
    main_div.innerHTML += '<a href="add_transaction.html?balance_id='+params.get('balance_id')+
               '">Add Transaction</a>';
}
else {
    console.log("No params");
    main_div.innerHTML = '';
}
*/

function getNewBalance() {
    const xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) {
            console.log(this.responseText);
            let data = JSON.parse(this.responseText);
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
            drawTransactions(JSON.parse(this.responseText));
        }
    };

    xhttp.open("GET", "http://localhost:5000/transaction/list/"+BALANCE_ID, true);
    xhttp.send();
}
