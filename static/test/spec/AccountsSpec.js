describe("Accounts", function() {

    let TEST_CONTAINER = null;
    const server = sinon.fakeServer.create();
    const response_data = {
        'accounts':
            [
                { 'balance': '10.12', 'name': 'Aktywa:Obrotowe' },
                { 'balance': '-3510.12', 'name': 'Kapitał' },
                { 'balance': '3500.00', 'name': 'Aktywa:Trwałe' },
            ]
    };

    server.respondWith('POST', '/api/accounts', [200, {'Content-Type':'application/json'}, JSON.stringify(response_data)]);

    beforeEach(function() {
        TEST_CONTAINER = document.getElementById('test-container');
        ACCOUNTS.PARENT_DIV = TEST_CONTAINER;
        server.respond();
    });

    afterEach(function() {
        TEST_CONTAINER = document.getElementById('test-container');

        while (TEST_CONTAINER.firstChild) {
            TEST_CONTAINER.removeChild(TEST_CONTAINER.lastChild);
        }
    });
 
    it("should convert accounts response into list of accounts", function() {
        const parsed_accounts = ACCOUNTS.loadFromJson(response_data['accounts']);
        const expected_result = [
            {'name': 'Aktywa', 'balance' : 3510.12, 'sub_accounts': [
                {'name': 'Obrotowe', 'balance' : 10.12, 'sub_accounts': []},
                {'name': 'Trwałe', 'balance' : 3500, 'sub_accounts': []}
            ]},
            {'name': 'Kapitał', 'balance' : -3510.12, 'sub_accounts': []}
        ];
        expect(parsed_accounts).toEqual(expected_result);
    }); 

    it("should calculate balance of fetched accounts", function() {
        const parsed_accounts = [
            {'name': 'Aktywa', 'balance' : 210.12, 'sub_accounts': [
                {'name': 'Obrotowe', 'balance' : 10.12, 'sub_accounts': []},
                {'name': 'Trwałe', 'balance' : 200, 'sub_accounts': []}
            ]},
            {'name': 'Kapitał', 'balance' : -3510.12, 'sub_accounts': []}
        ];
        const balance = ACCOUNTS.calculateBalance(parsed_accounts);
        expect(balance).toEqual(new Decimal('-3300.00'));
    });
});
