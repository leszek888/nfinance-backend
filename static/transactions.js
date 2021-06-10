var TRANSACTIONS = (function(tr) {

    let FILTERS = [];
    let LOADED_TRANSACTIONS = null;
    let LIST_DIV = null;
    tr.PARENT_DIV = null;
 
    const useAsFilter = (key, input, validator=null) => {
        input.addEventListener("keyup", (e) => {
            if (validator == null || validator(e.currentTarget)) {
                updateFilters(key, e.currentTarget.value);
            }
            else
                updateFilters(key, null);

            loadAndDisplayInParent();
        });
    }

    tr.display = () => {
        const transactions_menu = document.createElement('div');
            const new_transaction_button = document.createElement('input');

        const filter_menu = document.createElement('div');
            const filter_by_payee = createTextInput('Payee');
            const filter_by_date_from = createDateInput('From');
            const filter_by_date_to = createDateInput('To');
            const filter_by_account = createTextInput('Account');

        LIST_DIV = document.createElement('div');

        useAsFilter("from", filter_by_date_from, validateDateInput);
        useAsFilter("to", filter_by_date_to, validateDateInput);
        useAsFilter("payee", filter_by_payee);
        useAsFilter("account", filter_by_account);

        transactions_menu.classList.add('sub-window');

        filter_menu.classList.add('sub-window');
        filter_menu.classList.add('filter-menu');

        new_transaction_button.type = 'button';
        new_transaction_button.id = 'new_transaction_button';
        new_transaction_button.classList.add('rounded-button','color-accent');
        new_transaction_button.value = 'New Transaction';
        new_transaction_button.addEventListener('click', () => {
            drawNewTransaction(LIST_DIV);
        });

        transactions_menu.appendChild(new_transaction_button);
        filter_menu.appendChild(filter_by_date_from);
        filter_menu.appendChild(filter_by_date_to);
        filter_menu.appendChild(filter_by_payee);
        filter_menu.appendChild(filter_by_account);
        tr.PARENT_DIV.appendChild(transactions_menu);
        tr.PARENT_DIV.appendChild(filter_menu);
        tr.PARENT_DIV.appendChild(LIST_DIV);
        loadAndDisplayInParent();
    };

    const createTransactionInput = () => {
        const input = document.createElement('input');

        input.classList.add('data-field');
        input.classList.add('transaction-input');
        input.addEventListener('input', (e) => {
            e.currentTarget.classList.remove('has-error');
        });

        return input;
    }

    const createTransactionTextInput = (placeholder = null) => {
        const input = createTransactionInput();

        input.type = 'text';
        if (placeholder)
            input.placeholder = placeholder;

        return input;
    }

    const createTransactionNumberInput = (placeholder = null) => {
        const input = createTransactionTextInput(placeholder);

        input.classList.add('entry-amount');
        input.addEventListener('focusout', (e) => {
            if (validateNumberInput(e.currentTarget))
                fillOutUnbalancedAmount(e.currentTarget.closest('.transaction-row'));
        });

        return input;
    }

    const createTransactionDateInput = (placeholder = null) => {
        const input = createTransactionTextInput(placeholder);

        input.classList.add('date-field');
        input.addEventListener('change', (e) => {
            validateDateInput(e.currentTarget);
        });

        return input;
    }

    const createTransactionButton = (text) => {
        const button = document.createElement('input');
        button.type = 'button';
        button.classList.add('transaction-button');
        button.value = text;

        return button;
    }

    const updateFilters = (key, value) => {
        let updated = false;

        for (let i=0; i!=FILTERS.length; i++) {
            if (FILTERS[i]['key'] == key) {
                if (value == null) {
                    FILTERS.splice(i, 1);
                    updated = true;
                    break;
                }
                else {
                    FILTERS[i]['value'] = value;
                    updated = true;
                    break;
                }
            }
        }

        if (!updated && value != null) {
            FILTERS.push({'key':key, 'value': value});
        }
    };

    const drawEntryRow = (account, amount) => {
        const transaction_entries_row = document.createElement('div');
        const transaction_entries_account = document.createElement('div');
        const transaction_entries_amount = document.createElement('div');
        const transaction_entries_remove = document.createElement('div');

        const transaction_entries_account_input = createTransactionTextInput('Account');
        const transaction_entries_amount_input = createTransactionNumberInput('Amount');
        const transaction_entries_remove_button = createTransactionButton('X');

        transaction_entries_row.classList.add('.entry-row');

        transaction_entries_account_input.value = account;
        transaction_entries_amount_input.value = formatNumber(amount);

        transaction_entries_remove_button.addEventListener('click', (e) => {
            const entries_table = transaction_entries_row.parentNode;
            const clicked_entry = transaction_entries_row;
            const transaction = transaction_entries_row.closest('.transaction-row');
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
        });

        transaction_entries_account.appendChild(transaction_entries_account_input);
        transaction_entries_amount.appendChild(transaction_entries_amount_input);
        transaction_entries_remove.appendChild(transaction_entries_remove_button);

        transaction_entries_row.appendChild(transaction_entries_account);
        transaction_entries_row.appendChild(transaction_entries_amount);
        transaction_entries_row.appendChild(transaction_entries_remove);

        return transaction_entries_row;
    }

    const addEntry = (transaction) => {
        const parent = transaction.querySelector('.transaction-entries-wrapper');

        parent.insertBefore(drawEntryRow('',''), parent.lastChild);
    }

    const drawEmptyMessage = () => {
        const transaction_row = document.createElement('div');
        transaction_row.classList.add('empty-transaction-row');
        transaction_row.classList.add('transaction-row');

        transaction_row.innerText = 'No transactions found.';
        return transaction_row;
    }

    const drawRow = (transaction) => {
        const transaction_row = document.createElement('div');
            const transaction_header = document.createElement('div');
                const transaction_header_date = document.createElement('div');
                    const transaction_header_date_input = createTransactionDateInput('Date');
                const transaction_header_payee = document.createElement('div');
                    const transaction_header_payee_input = createTransactionTextInput('Payee');
                const transaction_header_buttons = document.createElement('div');

            const transaction_entries = document.createElement('div');

        transaction_row.id = transaction.id;
        transaction_row.addEventListener('mousedown', (e) => {edit(e.currentTarget);});
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
        transaction_header_date_input.disabled = true;
        transaction_header_payee_input.disabled = true;

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
        const transaction_remove_button = createTransactionButton('Delete'); 

        transaction_save_button.addEventListener('click', (e) => { 
            save(extractDataFromDOM(transaction_row));
        });
        transaction_cancel_button.addEventListener('click', (e) => {
            edit(null);
            if (transaction.id == "new-transaction") {
                transaction_row.parentNode.removeChild(transaction_row);
            }
            else
                transaction_row.parentNode.replaceChild(drawRow(transaction), transaction_row);
        });
        transaction_remove_button.addEventListener('click', (e) => { 
            remove(extractDataFromDOM(transaction_row));
        });

        transaction_buttons_div.classList.add('transaction-buttons-wrapper');
        transaction_buttons_div.appendChild(transaction_save_button);
        transaction_buttons_div.appendChild(transaction_cancel_button);
        transaction_buttons_div.appendChild(transaction_remove_button);

        transaction_row.appendChild(transaction_buttons_div);

        return transaction_row;
    }

    const drawNewTransaction = (container) => {
        if (container.querySelector('#new-transaction'))
            return;

        const table = container.querySelector('.transactions-rows-wrapper');
        const empty_transaction = {'id':'new-transaction','date':'', 'payee':'', 'entries': [
            {'account': '', 'amount':''},
            {'account': '', 'amount':''},
        ]};
        const transaction_row = drawRow(empty_transaction);
        table.insertBefore(transaction_row, table.children[1]);
        edit(transaction_row);
        transaction_row.querySelector('.transaction-input').focus();
    }

    tr.drawAll = (transactions) => {
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
                transactions_table.appendChild(drawRow(transaction));
            }
        }
        else {
            transactions_table.appendChild(drawEmptyMessage());
        }

        return transactions_table;
    }

    const calculateBalance = (transaction) => {
        const amounts = transaction.querySelectorAll('.entry-amount');

        let unbalanced_amount = new Decimal(0);

        amounts.forEach(amount => {
            if (validateFormattedNumber(amount.value)) {
                unbalanced_amount = unbalanced_amount.plus(convertStringToDecimal(amount.value));
            }
        });

        return (unbalanced_amount *= -1);
    }

    const validateBalance = (transaction) => {
        const amounts = transaction.querySelectorAll('.entry-amount');
        let unbalanced_amount = new Decimal(0);

        amounts.forEach(amount => {
            if (validateFormattedNumber(amount.value)) {
                unbalanced_amount = unbalanced_amount.plus(convertStringToDecimal(amount.value));
            }
            else if (validateFormattedNumber(amount.placeholder)) {
                unbalanced_amount = unbalanced_amount.plus(convertStringToDecimal(amount.placeholder));
            }
        });

        return unbalanced_amount;
    }

    const fillOutUnbalancedAmount = (transaction) => {
        const unbalanced_amount = calculateBalance(transaction);
        const amounts = transaction.querySelectorAll('.entry-amount');

        let first_free_field = null;

        amounts.forEach(amount => {
            amount.placeholder = 'Amount';
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

    const edit = (transaction_row) => {
        const inputs = document.querySelectorAll('.transaction-input');

        inputs.forEach(input => {
            input.disabled = true;
        });
        document.querySelectorAll('.transaction-row').forEach(transaction => {
            transaction.classList.remove('edited-transaction');
        });

        if (transaction_row == null) return;

        transaction_row.querySelectorAll('input').forEach(input => {
            input.disabled = false;
        });

        transaction_row.classList.add('edited-transaction');
    }

    const extractDataFromDOM = (row) => {
        const inputs = row.querySelectorAll('.transaction-input');
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

    const validate = (transaction) => {
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

        if (validateBalance(transaction) != 0) {
            displayPopup({'error':'Transaction is not balanced.'});
            transaction_valid = false;
        }
        return transaction_valid;
    }

    const save = (transaction) => {
        sendRequest("POST", "/api/transaction/save",
                    transaction,
                    (data) => {
                        loadAndDisplayInParent();
                    }
        );
    }

    const loadAndDisplayInParent = () => {
        filter_args = '';
        if ((FILTERS.length) > 0) {
            filter_args = '?';
            FILTERS.forEach(filter => {
                filter_args += filter['key'];
                filter_args += '=';
                filter_args += filter['value'];
                filter_args += '&';
            });
        }
        sendRequest("GET", "/api/transaction/list"+filter_args,
                    null,
                    (data) => {
                        LOADED_TRANSACTIONS = data;
                        clearElement(LIST_DIV);
                        LIST_DIV.appendChild(TRANSACTIONS.drawAll(LOADED_TRANSACTIONS));
                        edit(null);
                    }
        );
    }

    const remove = (transaction) => {
        sendRequest("DELETE", "/api/transaction/remove",
                    transaction,
                    loadAndDisplayInParent);
    }

    return tr;
}(TRANSACTIONS || {}));
