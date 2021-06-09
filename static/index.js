"use strict";

const NUMBER_LOCALE = 'de-DE';

let BALANCE_ID = null
let MAIN_DIV = null;
let TRANSACTIONS_DIV = null;

function initialize() {
    MAIN_DIV = document.getElementById("main_content");
    TRANSACTIONS_DIV = document.createElement('div');

    if (getCookie('balance_id')) {
        BALANCE_ID = getCookie('balance_id');
        const path = window.location.pathname;
        fetchBalance();

        if (path == '/transactions') {
            displayTransactions();
        }
        else {
            displayBalance();
        }
            
    }
    else {
        window.location.replace('/login');
    }
}

function logout() {
    var expired_date = new Date();
    expired_date.setTime(expired_date.getTime()-1000);

    document.cookie = "balance_id=;expires="+expired_date.toUTCString();
    window.location.replace("/login");
}

function clearElement(element) {
    if (element == null)
        return;

    while (element.firstChild)
        element.lastChild.remove();
}

function selectLink(link_id) {
    const nav_links = document.querySelectorAll('.nav-link');
    const selected_link = document.getElementById(link_id);

    nav_links.forEach(nav_link => {
        nav_link.classList.remove('link-selected');
    });

    if (selected_link != null)
        selected_link.classList.add('link-selected');
}

function createTextInput(placeholder = null) {
    const input = document.createElement('input');
    input.type = 'text';
    input.classList.add('main-text-input');
    if (placeholder != null)
        input.placeholder = placeholder;

    return input;
}

function createDateInput(placeholder = null) {
    const input = createTextInput(placeholder);

    return input;
}

function useAsFilter(key, input, validator=null) {
    input.addEventListener("keyup", (e) => {
        if (validator == null || validator(e.currentTarget)) {
            TRANSACTIONS.updateFilters(key, e.currentTarget.value);
        }
        else
            TRANSACTIONS.updateFilters(key, null);

        TRANSACTIONS.retreive();
    });
}

function displayTransactions() {
    clearElement(MAIN_DIV);

    selectLink('transactions-link');

    const transactions_menu = document.createElement('div');
    const new_transaction_button = document.createElement('input');
    const filter_menu = document.createElement('div');
    const filter_by_payee = createTextInput('Payee');
    const filter_by_date_from = createDateInput('From');
    const filter_by_date_to = createDateInput('To');
    const filter_by_account = createTextInput('Account');

    useAsFilter("from", filter_by_date_from, validateDateInput);
    useAsFilter("to", filter_by_date_to, validateDateInput);
    useAsFilter("payee", filter_by_payee);
    useAsFilter("account", filter_by_account);

    transactions_menu.classList.add('sub-window');
    filter_menu.classList.add('sub-window');
    filter_menu.classList.add('filter-menu');

    new_transaction_button.type = 'button';
    new_transaction_button.classList.add('rounded-button','color-navy');
    new_transaction_button.value = 'New Transaction';
    new_transaction_button.addEventListener('click', () => {
        TRANSACTIONS.drawNewTransaction(TRANSACTIONS_DIV);
    });

    transactions_menu.appendChild(new_transaction_button);
    filter_menu.appendChild(filter_by_date_from);
    filter_menu.appendChild(filter_by_date_to);
    filter_menu.appendChild(filter_by_payee);
    filter_menu.appendChild(filter_by_account);
    MAIN_DIV.appendChild(transactions_menu);
    MAIN_DIV.appendChild(filter_menu);
    MAIN_DIV.appendChild(TRANSACTIONS_DIV);
}

function displayBalance(raport) {
    const sub_links = document.querySelector('.nav-sub-links');

    const link_balance = document.createElement('button');
    const link_net_worth = document.createElement('button');
    const link_cash_flow = document.createElement('button');

    link_balance.classList.add('tab-button', 'color-black');
    link_net_worth.classList.add('tab-button', 'color-black');
    link_cash_flow.classList.add('tab-button', 'color-black');

    link_balance.addEventListener('click', () => {displayBalance('balance');});
    link_net_worth.addEventListener('click', () => {displayBalance('net-worth');});
    link_cash_flow.addEventListener('click', () => {displayBalance('cash-flow');});

    link_balance.innerText = 'Balance';
    link_net_worth.innerText = 'Net Worth';
    link_cash_flow.innerText = 'Cash Flow';

    clearElement(sub_links);
    clearElement(MAIN_DIV);
    ACCOUNTS.PARENT_DIV = MAIN_DIV;

    function set_selected(link) {
        link.classList.remove('color-black');
        link.classList.add('color-navy');
    }

    if (raport == 'net-worth') {
        ACCOUNTS.loadAndDisplayInParent({'account':['Aktywa','Zobowiązania']})
        set_selected(link_net_worth);
    }

    else if (raport == 'cash-flow') {
        ACCOUNTS.loadAndDisplayInParent({'account':['Przychód','Wydatki']})
        set_selected(link_cash_flow);
    }

    else {
        ACCOUNTS.loadAndDisplayInParent();
        set_selected(link_balance);
    }

    selectLink('balance-link');
    sub_links.appendChild(link_balance);
    sub_links.appendChild(link_net_worth);
    sub_links.appendChild(link_cash_flow);
}

function displayPopup(message) {
    const popup = document.createElement('div');
    const msg = document.createElement('span');
    
    popup.classList.add('popup-message');
    popup.classList.add('animated');
    popup.addEventListener("click", () => popup.classList.add('fadeOut'));

    setTimeout(function() {
        popup.classList.add('fadeOut');
        setTimeout(function() {
            document.body.removeChild(popup);
        }, 2000);
    }, 2000);

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
        if (cookie_name[0].trim() == name) {
            cookie_value = cookie_name[1];
        }
    });

    return cookie_value;
}

function formatNumber(number) {
    if (number == null || number.toString().length == 0)
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

function convertStringToDecimal(number) {
    number = number.toString().replaceAll(' ', '');
    if (validateFormattedNumber(number)) {
        number = number.replaceAll('.','').replaceAll(',','.');
    }
    if (number.length == 0) {
        return '';
    }
    return Decimal(number);
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

function fetchBalance() {
    if (BALANCE_ID.length == 36) {
        TRANSACTIONS.retreive();
    }
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
    input_field.classList.remove('has-error');
    if (input_field.value.length == 0)
        return false;

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

function getNewBalance() {
    sendRequest("GET", "/api/balance/new",
                null,
                (data) => {
                    BALANCE_ID = data['balance_id'];
                    updateContentWithBalance();
                    clearElement(TRANSACTIONS_DIV);
                    TRANSACTIONS_DIV.appendChild(TRANSACTIONS.drawAll(null));
                }
    );
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
