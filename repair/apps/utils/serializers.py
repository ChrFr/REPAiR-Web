from typing import Type
import pandas as pd
from django_pandas.io import read_frame
import numpy as np
import os
from django.utils.translation import ugettext as _
from tempfile import NamedTemporaryFile
from rest_framework import serializers
from django.db.models import Model
from django.db.models.query import QuerySet
from django.conf import settings


class BulkValidationError(Exception):
    def __init__(self, message, path=''):
        super().__init__(message)
        self.message = message
        self.path = path


class FileFormatError(BulkValidationError):
    """File Encoding is broken"""


class MalformedFileError(BulkValidationError):
    """the file content is malformed (e.g. missing columns)"""


class ValidationError(BulkValidationError):
    """general error occurring while validating data"""


class ForeignKeyNotFound(BulkValidationError):
    """related foreign key in file content not found in existing data"""


class BulkResult:
    def __init__(self, queryset, rows_added=0, rows_updated=0):
        self.rows_added = rows_added
        self.rows_updated = rows_updated
        self.queryset = queryset


def TemporaryMediaFile():
    '''
    temporary file served in the media folder,
    file.url - relative url to access file
    file.name - path to file
    '''
    path = os.path.join(settings.MEDIA_ROOT, 'tmp')
    if not os.path.exists(path):
        os.mkdir(path)
    wrapper = NamedTemporaryFile(mode='w', dir=path, delete=False)
    p, fn = os.path.split(wrapper.name)
    wrapper.file.url = os.path.join(settings.MEDIA_URL, fn)
    return wrapper


class BulkSerializerMixin(metaclass=serializers.SerializerMetaclass):
    bulk_upload = serializers.FileField(required=False,
                                        write_only=True)
    # important: input file will be checked if it contains those columns
    # (letter case doesn't matter)
    bulk_columns = []

    def __init_subclass__(cls, **kwargs):
        """add bulk_upload to the cls.Meta if it does not exist there"""
        fields = cls.Meta.fields
        if fields and 'bulk_upload' not in fields:
            cls.Meta.fields = fields + ('bulk_upload', )
        return super().__init_subclass__(**kwargs)

    def to_internal_value(self, data):
        """
        Convert csv-data to pandas dataframe and
        add it as attribute `dataframe` to the validated data
        add also `keyflow_id` to validated data
        """
        file = data.pop('bulk_upload', None)
        if file is None:
            return super().to_internal_value(data)

        # other fields are not required when bulk uploading
        fields = self._writable_fields
        for field in fields:
            field.required = False
        ret = super().to_internal_value(data)  # would throw exc. else

        encoding = 'cp1252'
        try:
            df_new = pd.read_csv(file[0], sep='\t', encoding=encoding)
        except pd.errors.ParserError as e:
            raise MalformedFileError(str(e))

        df_new = df_new.\
            rename(columns={c: c.lower() for c in df_new.columns})

        bulk_columns = [c.lower() for c in self.bulk_columns]
        missing_cols = list(set(bulk_columns).difference(set(df_new.columns)))

        if missing_cols:
            raise MalformedFileError(
                _('The following columns are missing: {}'.format(missing_cols)))

        ret['dataframe'] = df_new
        request = self.context['request']
        url_pks = request.session.get('url_pks', {})
        keyflow_id = url_pks.get('keyflow_pk')
        ret['keyflow_id'] = keyflow_id
        return ret

    def create(self, validated_data):
        if 'dataframe' not in validated_data:
            return super().create(validated_data)
        return self.bulk_create(validated_data)

    def bulk_create(self, validated_data):
        '''
        bulk create models based on 'dataframe' in validated_data

        Returns
        ----------------
        BulkResult
        '''
        raise NotImplementedError('`bulk_create()` must be implemented.')

    def merge_foreign_keys(self,
                           data: pd.DataFrame,
                           referenced_queryset: QuerySet,
                           referencing_column: str,
                           target_column: str=None,
                           referenced_column: str='code'
                           ):
        """
        merge models from queryset to data by foreign key

        Parameters
        ----------
        data: pd.Dataframe
            the dataframe with the rows to check
        referenced_queryset: Queryset
            queryset of the referenced Model
        referencing_column: str
            the referencing column in data that should be checked
        referenced_queryset: str, optional(default='code')
            the referenced column to search in

        Returns
        -------
        existing_keys: pd.Dataframe
            the merged dataframe
        missing_rows: pd.Dataframe
            the rows in the df_new where rows are missing
        """
        # only the id of the referenced queryset is relevant
        fieldnames = ['id']
        fieldnames.append(referenced_column)
        # get existing rows in the referenced table of the keyflow
        df_referenced = read_frame(referenced_queryset,
                                   index_col=[referenced_column],
                                   fieldnames=fieldnames)
        df_referenced['_models'] = referenced_queryset

        # check if an activitygroup exist for each activity
        df_merged = data.merge(df_referenced,
                               left_on=referencing_column,
                               right_index=True,
                               how='left',
                               indicator=True,
                               suffixes=['', '_old'])

        missing_rows = df_merged.loc[df_merged._merge=='left_only']
        existing_rows = df_merged.loc[df_merged._merge=='both']

        if not target_column:
            target_column = referencing_column

        existing_rows[target_column] = existing_rows['_models']

        missing_rows.drop(columns=['_merge', 'id'], inplace=True)
        existing_rows.drop(columns=['_merge', 'id', '_models'], inplace=True)
        return existing_rows, missing_rows

    def to_representation(self, instance):
        """
        Object instance -> Dict of primitive datatypes.
        """
        if isinstance(instance, BulkResult):
            ret = {
                'count': len(instance.queryset),
                'added': instance.rows_added,
                'updated': instance.rows_updated
            }
            results = ret['results'] = []
            for model in instance.queryset:
                results.append(super().to_representation(model))
            return ret
        return super().to_representation(instance)


class EnumField(serializers.ChoiceField):
    def __init__(self, enum, **kwargs):
        self.enum = enum
        kwargs['choices'] = [(e.name, e.name) for e in enum]
        super(EnumField, self).__init__(**kwargs)

    def to_representation(self, obj):
        return obj.name

    def to_internal_value(self, data):
        try:
            if data not in self.enum._member_names_:
                data = data.upper()
            return self.enum[data]
        except KeyError:
            self.fail('invalid_choice', input=data)
