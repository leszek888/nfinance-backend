describe("Transactions", function() {

    let TEST_CONTAINER = null;

    beforeEach(function() {
        TEST_CONTAINER = document.getElementById('test-container');
    });

    afterEach(function() {
        TEST_CONTAINER = document.getElementById('test-container');

        while (TEST_CONTAINER.firstChild) {
            TEST_CONTAINER.removeChild(TEST_CONTAINER.lastChild);
        }
    });

    it("should convert transaction from JSON into DOM Elements and back to JSON", function() {
        const transaction_JSON = {
            'id': '1',
            'date': '2020-01-01',
            'payee': 'Payee',
            'entries' : [
                {'account':'Debit', 'amount':'5'},
                {'account':'Credit', 'amount':'-5'}
            ]
        };

        const transaction_ROW = drawTransactionRow(transaction_JSON);

        const data_fields = transaction_ROW.querySelectorAll('.data-field');
        expect(data_fields.length).toEqual(6);
        expect(data_fields[0].value).toEqual('2020-01-01');
        expect(data_fields[1].value).toEqual('Payee');
        expect(data_fields[2].value).toEqual('Debit');
        expect(transaction_ROW.id).toEqual(transaction_JSON.id);

        const new_transaction_JSON = extractDataFromTransactionRow(transaction_ROW);
        expect(new_transaction_JSON['id']).toEqual('1');
        expect(new_transaction_JSON['date']).toEqual('2020-01-01');
        expect(new_transaction_JSON['entries'].length).toEqual(2);
        expect(new_transaction_JSON['entries'][1]['amount']).toEqual(-5);
    });

    it("should calculate unbalanced amount from DOM Elements", function() {
        const transaction_JSON = {
            'id': '1',
            'date': '2020-01-01',
            'payee': 'Payee',
            'entries' : [
                {'account':'Debit', 'amount':'10'},
                {'account':'Credit', 'amount':'-6'},
                {'account':'Unbalanced', 'amount':''}
            ]
        };

        const transaction_ROW = drawTransactionRow(transaction_JSON);
        const unbalanced_amount = calculateTransactionBalance(transaction_ROW);

        expect(unbalanced_amount).toEqual(-4);
    });

    it("should automatically fill out unbalanced amount in first free amount field", function() {
        const transaction_JSON = {
            'id': '1',
            'date': '2020-01-01',
            'payee': 'Payee',
            'entries' : [
                {'account':'Debit', 'amount':'10'},
                {'account':'Credit', 'amount':'-6'},
                {'account':'Unbalanced', 'amount':''}
            ]
        };

        const transaction_ROW = drawTransactionRow(transaction_JSON);
        fillOutUnbalancedAmount(transaction_ROW);
        const amount_fields = transaction_ROW.querySelectorAll('.entry-amount');
        let balance_found = false;

        amount_fields.forEach(field => {
            if (field.placeholder === '-4,00')
                balance_found = true;
        });

        expect(balance_found).toEqual(true);
    });

    describe("should validate transaction fields before saving", function() {
        let transaction_JSON = {
            'id': '1',
            'date': '2020-01-01',
            'payee': 'Payee',
            'entries' : [
                {'account':'Debit', 'amount':'a'},
                {'account':'Credit', 'amount':'b'},
                {'account':'Unbalanced', 'amount':'c'}
            ]
        };

        let transaction_ROW = null;

        beforeEach(function() {
            transaction_ROW = drawTransactionRow(transaction_JSON);
        });

        it("should validate the number fields before saving", function() {
            const number_field = transaction_ROW.querySelector('.entry-amount');

            number_field.value = 'a';
            expect(validateNumberInput(number_field)).toEqual(false);

            number_field.value = '00.0';
            expect(validateNumberInput(number_field)).toEqual(false);

            number_field.value = '1.1.1';
            expect(validateNumberInput(number_field)).toEqual(false);

            number_field.value = '-5,5';
            expect(validateNumberInput(number_field)).toEqual(true);
        });

        it("should validate all fields before saving", function() {
            validateTransaction(transaction_ROW);
            const errors = transaction_ROW.querySelectorAll('.has-error');

            expect(errors.length).toEqual(3);
        });

        it("should validate the date format YYYY-MM-DD", function() {
            const date_field = transaction_ROW.querySelector('.date-field');

            date_field.value = 'a';
            expect(validateDateInput(date_field)).toEqual(false);

            date_field.value = '2020/02/01';
            expect(validateDateInput(date_field)).toEqual(false);

            date_field.value = '2020-13-01';
            expect(validateDateInput(date_field)).toEqual(false);

            date_field.value = '2020-1-1';
            expect(validateDateInput(date_field)).toEqual(true);

            date_field.value = '2020-01-01';
            expect(validateDateInput(date_field)).toEqual(true);

        });
    });

});
