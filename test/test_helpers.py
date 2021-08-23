from decimal import *
from nbudget import get_formatted_decimal

import unittest

class HelpersTest(unittest.TestCase):
    def test_rounding_decimals(self):
        dec1 = Decimal('1')
        dec2 = Decimal('1.1')
        dec3 = Decimal('1.01')
        dec4 = Decimal('1.000001')
        dec5 = Decimal('1.100000000')
        dec6 = Decimal('1.000000000')

        self.assertEqual('1.00', get_formatted_decimal(dec1))
        self.assertEqual('1.10', get_formatted_decimal(dec2))
        self.assertEqual('1.01', get_formatted_decimal(dec3))
        self.assertEqual('1.000001', get_formatted_decimal(dec4))
        self.assertEqual('1.10', get_formatted_decimal(dec5))
        self.assertEqual('1.00', get_formatted_decimal(dec6))
