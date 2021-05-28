var TRANSACTIONS = (function(tr) {
 
    let createTransactionInput = () => {
        const input = document.createElement('input');

        input.classList.add('data-field');
        input.classList.add('transaction-input');
        input.addEventListener('input', (e) => {
            e.currentTarget.classList.remove('has-error');
        });

        return input;
    }

    let createTransactionTextInput = () => {
        const input = createTransactionInput();

        input.type = 'text';

        return input;
    }

    let createTransactionNumberInput = () => {
        const input = createTransactionTextInput();

        input.classList.add('entry-amount');
        input.addEventListener('focusout', (e) => {
            if (validateNumberInput(e.currentTarget))
                fillOutUnbalancedAmount(e.currentTarget.closest('.transaction-row'));
        });

        return input;
    }

    let createTransactionDateInput = () => {
        const input = createTransactionTextInput();

        input.classList.add('date-field');
        input.addEventListener('change', (e) => {
            validateDateInput(e.currentTarget);
        });

        return input;
    }

    let createTransactionButton = (text) => {
        const button = document.createElement('input');
        button.type = 'button';
        button.classList.add('transaction-button');
        button.value = text;

        return button;
    }

    tr.drawEntryRow = (account, amount) => {
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

    tr.drawEmptyMessage = () => {
        const transaction_row = document.createElement('div');
        transaction_row.classList.add('empty-transaction-row');
        transaction_row.classList.add('transaction-row');

        transaction_row.innerText = 'No transactions found.';
        return transaction_row;
    }

    tr.drawRow = (transaction) => {
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
            transaction_entries.appendChild(tr.drawEntryRow(entry.account, entry.amount));
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
                transactions_table.appendChild(tr.drawRow(transaction));
            }
        }
        else {
            transactions_table.appendChild(tr.drawEmptyMessage());
        }

        return transactions_table;
    }

    return tr;
}(TRANSACTIONS || {}));
