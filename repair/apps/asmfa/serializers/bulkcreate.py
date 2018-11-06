import pandas as pd
from django_pandas.io import read_frame
from repair.apps.utils.serializers import BulkSerializerMixin
from repair.apps.asmfa.serializers import (ActivityGroupSerializer,
                                           ActivitySerializer,
                                           )
from repair.apps.asmfa.models import (KeyflowInCasestudy,
                                      ActivityGroup,
                                      Activity,
                                      )


class ActivityGroupCreateSerializer(BulkSerializerMixin,
                                    ActivityGroupSerializer):

    #class Meta(ActivityGroupSerializer.Meta):
        #fields = ('id', 'code', 'name')

    def bulk_create(self, validated_data):
        """Bulk create of data"""
        keyflow_id = validated_data.pop('keyflow_id')
        df_ag_new = validated_data.pop('dataframe')

        index_col = 'code'
        df_ag_new.set_index(index_col, inplace=True)

        kic = KeyflowInCasestudy.objects.get(id=keyflow_id)

        # get existing activitygroups of keyflow
        qs = ActivityGroup.objects.filter(keyflow_id=kic.id)
        df_ag_old = read_frame(qs, index_col=['code'])

        existing_ag = df_ag_new.merge(df_ag_old,
                                      left_index=True,
                                      right_index=True,
                                      how='left',
                                      indicator=True,
                                      suffixes=['', '_old'])
        new_ag = existing_ag.loc[existing_ag._merge=='left_only'].reset_index()
        idx_both = existing_ag.loc[existing_ag._merge=='both'].index

        # set the KeyflowInCasestudy for the new rows
        new_ag.loc[:, 'keyflow'] = kic

        # skip columns, that are not needed
        field_names = [f.name for f in ActivityGroup._meta.fields]
        drop_cols = []
        for c in new_ag.columns:
            if not c in field_names or c.endswith('_old'):
                drop_cols.append(c)
        drop_cols.append('id')
        new_ag.drop(columns=drop_cols, inplace=True)

        # set default values for columns not provided
        defaults = {col: ActivityGroup._meta.get_field(col).default
                    for col in new_ag.columns}
        new_ag = new_ag.fillna(defaults)

        # create the new rows
        ags = []
        ag = None
        for row in new_ag.itertuples(index=False):
            row_dict = row._asdict()
            ag = ActivityGroup(**row_dict)
            ags.append(ag)
        ActivityGroup.objects.bulk_create(ags)

        # update existing values
        ignore_cols = ['id', 'keyflow']

        df_updated = df_ag_old.loc[idx_both]
        df_updated.update(df_ag_new)
        for row in df_updated.reset_index().itertuples(index=False):
            ag = ActivityGroup.objects.get(keyflow=kic,
                                           code=row.code)
            for c, v in row._asdict().items():
                if c in ignore_cols:
                    continue
                setattr(ag, c, v)
            ag.save()
        new_ags = ActivityGroup.objects.filter(code__in=df_ag_new.index.values)
        return new_ags


class ActivityCreateSerializer(BulkSerializerMixin,
                               ActivitySerializer):


    def bulk_create(self, validated_data):
        """Bulk create of data"""
        keyflow_id = validated_data.pop('keyflow_id')
        df_act_new = validated_data.pop('dataframe')

        existing_rows, missing_rows = self.check_foreign_keys(
            df_new=df_act_new,
            referenced_table=ActivityGroup,
            referencing_column='ag',
            filter_value=keyflow_id)

        print(f'existing: {existing_rows.len()}')
        print(f'missing: {missing_rows.len()}')
        index_col = 'code'

        # get existing activities of keyflow
        qs = Activity.objects.filter(activitygroup__keyflow_id=keyflow_id)
        df_act_old = read_frame(qs, index_col=[index_col])

        return act
