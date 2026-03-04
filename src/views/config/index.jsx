import { useState, useEffect } from '@forge/react';
import ForgeReconciler, { Button, Text, Stack, Box, Textfield, Form, Label } from '@forge/react';
import { invoke } from '@forge/bridge';

const generateId = () => Math.random().toString(36).substr(2, 9);

const ConfigAdmin = () => {
    const [config, setConfig] = useState({ options: [] });
    const [loading, setLoading] = useState(true);
    const [addState, setAddState] = useState({ level: null, parentIndices: [] });
    const [newLabel, setNewLabel] = useState('');

    useEffect(() => {
        invoke('getConfig').then(data => {
            setConfig(data || { options: [] });
            setLoading(false);
        });
    }, []);

    const saveToJira = async (newOptions) => {
        const newConfig = { options: newOptions };
        setConfig(newConfig);
        await invoke('saveConfig', newConfig);
    };

    const confirmAdd = async (formData) => {
        const addedLabel = (formData && formData.label) ? formData.label : newLabel;
        if (!addedLabel || !addedLabel.trim()) return;
        const { level, parentIndices } = addState;
        const newOptions = [...(config.options || [])];

        if (level === 1) {
            newOptions.push({ id: generateId(), label: addedLabel, children: [] });
        } else if (level === 2) {
            newOptions[parentIndices[0]].children = newOptions[parentIndices[0]].children || [];
            newOptions[parentIndices[0]].children.push({ id: generateId(), label: addedLabel, children: [] });
        } else if (level === 3) {
            const l2 = newOptions[parentIndices[0]].children[parentIndices[1]];
            l2.children = l2.children || [];
            l2.children.push({ id: generateId(), label: addedLabel });
        }
        setAddState({ level: null, parentIndices: [] });
        setNewLabel('');
        await saveToJira(newOptions);
    };

    const removeLevel = async (level, indices) => {
        const newOptions = [...config.options];
        if (level === 1) newOptions.splice(indices[0], 1);
        else if (level === 2) newOptions[indices[0]].children.splice(indices[1], 1);
        else if (level === 3) newOptions[indices[0]].children[indices[1]].children.splice(indices[2], 1);
        await saveToJira(newOptions);
    };

    if (loading) return <Text>Cargando configuración...</Text>;

    return (
        <Box>
            <Text>Configuración de Triple Cascada</Text>

            {addState.level !== null && (
                <Box>
                    <Text>Agregando Nivel {addState.level}</Text>
                    <Form onSubmit={confirmAdd}>
                        <Label labelFor="lbl">Nombre de la opción</Label>
                        <Textfield name="label" id="lbl" onChange={(e) => setNewLabel(e.target.value)} />
                        <Button type="submit" appearance="primary">Guardar</Button>
                        <Button onClick={() => setAddState({ level: null, parentIndices: [] })}>Cancelar</Button>
                    </Form>
                </Box>
            )}

            {addState.level === null && (
                <Box>
                    <Button onClick={() => { setAddState({ level: 1, parentIndices: [] }); setNewLabel(''); }}>+ Agregar Nivel 1</Button>
                    {config.options?.map((l1, i1) => (
                        <Box key={l1.id}>
                            <Stack alignInline="start" space="space.100">
                                <Text>L1: {l1.label}</Text>
                                <Button onClick={() => { setAddState({ level: 2, parentIndices: [i1] }); setNewLabel(''); }}>+ L2</Button>
                                <Button appearance="danger" onClick={() => removeLevel(1, [i1])}>Eliminar</Button>
                            </Stack>
                            {l1.children?.map((l2, i2) => (
                                <Box key={l2.id}>
                                    <Stack alignInline="start" space="space.100">
                                        <Text>  L2: {l2.label}</Text>
                                        <Button onClick={() => { setAddState({ level: 3, parentIndices: [i1, i2] }); setNewLabel(''); }}>+ L3</Button>
                                        <Button appearance="danger" onClick={() => removeLevel(2, [i1, i2])}>Eliminar</Button>
                                    </Stack>
                                    {l2.children?.map((l3, i3) => (
                                        <Box key={l3.id}>
                                            <Stack alignInline="start" space="space.100">
                                                <Text>    L3: {l3.label}</Text>
                                                <Button appearance="danger" onClick={() => removeLevel(3, [i1, i2, i3])}>Eliminar</Button>
                                            </Stack>
                                        </Box>
                                    ))}
                                </Box>
                            ))}
                        </Box>
                    ))}
                </Box>
            )}
        </Box>
    );
};

ForgeReconciler.render(<ConfigAdmin />);
