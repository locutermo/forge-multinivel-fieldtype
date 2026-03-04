import ForgeReconciler, { Text, useProductContext } from '@forge/react';

const ReadField = () => {
    const context = useProductContext();
    const fieldValue = context?.extension?.fieldValue;

    if (!fieldValue || (!fieldValue.level1 && !fieldValue.l1_label)) {
        return <Text></Text>;
    }

    const parts = [
        fieldValue.level1 || fieldValue.l1_label,
        fieldValue.level2 || fieldValue.l2_label,
        fieldValue.level3 || fieldValue.l3_label
    ].filter(Boolean);

    return (
        <Text>{parts.join(' > ')}</Text>
    );
};

ForgeReconciler.render(<ReadField />);
