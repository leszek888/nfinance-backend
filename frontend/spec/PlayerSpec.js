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

    it("should convert transaction from JSON into DOM Elements", function() {
        const transaction_JSON = {
            'id': '1',
            'date': '2020-01-01',
            'payee': 'Payee',
            'entries' : [
                {'account':'Debit', 'amount':'5'},
                {'account':'Debit', 'amount':'5'}
            ]
        };

        const transaction_ROW = drawTransactionRow(transaction_JSON);

        const data_fields = transaction_ROW.querySelectorAll('.data-field');
        expect(data_fields.length).toEqual(6);
        expect(data_fields[0].value).toEqual('2020-01-01');
        expect(data_fields[1].value).toEqual('Payee');
        expect(data_fields[2].value).toEqual('Debit');
        expect(transaction_ROW.id).toEqual(transaction_JSON.id);
    });

});
