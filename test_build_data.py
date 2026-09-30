"""Offline checks for dashboard-only data and verified FK imports."""
import runpy
import unittest
from pathlib import Path

build = runpy.run_path(str(Path(__file__).with_name('build-data.py')))['build']


class BuildDataTest(unittest.TestCase):
    def setUp(self):
        self.snapshot = {
            'databases': [{'label': 'test'}],
            'customers': [],
            'schemas': [
                {'schema': 'a', 'approx_total_size_pretty': '1 MB', 'rows': [
                    {'tabelnavn': 'parcel', 'beskrivelse': 'parcel'},
                    {'tabelnavn': 'parcel_se', 'beskrivelse': 'variant'},
                ]},
                {'schema': 'b', 'approx_total_size_pretty': '1 MB', 'rows': [
                    {'tabelnavn': 'parcel', 'beskrivelse': 'parcel'},
                ]},
            ],
        }

    def test_missing_catalog_is_not_zero_foreign_keys(self):
        data = build(self.snapshot)
        self.assertEqual(data['foreignKeyStatus'], 'unavailable')
        self.assertFalse(any(e[2] == 3 for e in data['edges']))

    def test_same_name_links_every_other_schema(self):
        self.snapshot['schemas'].append({'schema': 'c', 'approx_total_size_pretty': '1 MB',
                                         'rows': [{'tabelnavn': 'parcel'}]})
        edges = build(self.snapshot)['edges']
        self.assertEqual({(e[0], e[1]) for e in edges if e[2] == 2},
                         {(0, 2), (0, 3), (2, 3)})

    def test_columns_join_only_exact_dashboard_dataset_and_create_hints(self):
        rows = [
            {'table_schema': 'a', 'table_name': 'parcel', 'column_name': 'parcel_se_id',
             'data_type': 'uuid', 'is_nullable': 'NO'},
            {'table_schema': 'b', 'table_name': 'parcel', 'column_name': 'parcel_se',
             'data_type': 'text', 'is_nullable': 'YES'},
            {'table_schema': 'a', 'table_name': 'old_view', 'column_name': 'parcel',
             'data_type': 'text', 'is_nullable': 'YES'},
        ]
        data = build(self.snapshot, column_rows=rows)
        self.assertEqual(data['nodes'][0]['c'][0][:3], ['parcel_se_id', 'uuid', False])
        self.assertNotIn('c', data['nodes'][1])
        self.assertEqual(len(data['nodes']), 3)
        self.assertIn([2, 1, 4, 'parcel_se'], data['edges'])
        # A naming variant already links the local pair: no duplicate line.
        self.assertEqual(len([e for e in data['edges'] if {e[0], e[1]} == {0, 1}]), 1)

    def test_generic_column_names_do_not_create_cross_schema_hints(self):
        self.snapshot['schemas'][1]['rows'].append({'tabelnavn': 'link'})
        data = build(self.snapshot, column_rows=[
            {'table_schema': 'a', 'table_name': 'parcel', 'column_name': 'link',
             'data_type': 'text', 'is_nullable': 'YES'},
        ])
        self.assertFalse(any(e[2] == 4 for e in data['edges']))

    def test_import_replaces_hint_and_preserves_direction_and_columns(self):
        fk = {'name': 'parcel_ref', 'schema': 'b', 'table': 'parcel',
              'columns': ['code', 'version'], 'referenced_schema': 'a',
              'referenced_table': 'parcel', 'referenced_columns': ['id', 'revision']}
        data = build(self.snapshot, [fk])
        self.assertEqual(data['foreignKeyStatus'], 'imported')
        self.assertEqual([e for e in data['edges'] if e[2] == 3],
                         [[2, 0, 3, [{'name': 'parcel_ref', 'columns': ['code', 'version'],
                                      'referenced_columns': ['id', 'revision']}]]])
        self.assertFalse(any({e[0], e[1]} == {0, 2} and e[2] != 3 for e in data['edges']))

    def test_import_replaces_column_hint_in_either_direction(self):
        rows = [{'table_schema': 'b', 'table_name': 'parcel', 'column_name': 'parcel_se',
                 'data_type': 'text', 'is_nullable': 'YES'}]
        fk = {'name': 'ref', 'schema': 'a', 'table': 'parcel_se', 'columns': ['id'],
              'referenced_schema': 'b', 'referenced_table': 'parcel', 'referenced_columns': ['id']}
        data = build(self.snapshot, [fk], rows)
        self.assertEqual(len([e for e in data['edges'] if {e[0], e[1]} == {1, 2}]), 1)
        self.assertIn([1, 2, 3, [{'name': 'ref', 'columns': ['id'], 'referenced_columns': ['id']}]], data['edges'])

    def test_unmatched_constraint_does_not_create_fake_dataset(self):
        fk = {'name': 'missing', 'schema': 'b', 'table': 'parcel', 'columns': ['id'],
              'referenced_schema': 'other', 'referenced_table': 'absent',
              'referenced_columns': ['id']}
        data = build(self.snapshot, [fk])
        self.assertEqual(data['skippedForeignKeys'], 1)
        self.assertFalse(any(e[2] == 3 for e in data['edges']))


if __name__ == '__main__':
    unittest.main()
