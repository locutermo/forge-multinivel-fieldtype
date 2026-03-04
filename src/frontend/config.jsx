import React, { useState, useEffect } from 'react';
import ForgeReconciler, { Button, Text, Stack, Box, Textfield, Form, Label } from '@forge/react';
import { invoke } from '@forge/bridge';

const generateId = () => Math.random().toString(36).substr(2, 9);

const ConfigAdmin = () => {
    const [config, setConfig] = useState({ options: [] });
    const [loading, setLoading] = useState(true);

    const [addState, setAddState] = useState({ level: null, parentIndices: [] });
    const [newLabel, setNewLabel] = useState("");

    const fetchData = async () => {
        const data = await invoke('getConfig');
        setConfig(data);
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, []);

    const saveToJira = async (newOptions) => {
        const newConfig = { options: newOptions };
        setConfig(newConfig);
        await invoke('saveConfig', newConfig);
    };

    const addLevel1 = () => {
        setAddState({ level: 1, parentIndices: [] });
        setNewLabel("");
    };

    const addLevel2 = (i1) => {
        setAddState({ level: 2, parentIndices: [i1] });
        setNewLabel("");
    };

    const addLevel3 = (i1, i2) => {
        setAddState({ level: 3, parentIndices: [i1, i2] });
        setNewLabel("");
    };

    const confirmAdd = async (formData) => {
        let addedLabel = newLabel;
        if (formData && formData.label) addedLabel = formData.label;

        if (!addedLabel || !addedLabel.trim()) return;
        const { level, parentIndices } = addState;
        let newOptions = [...(config.options || [])];

        if (level === 1) {
            newOptions.push({ id: generateId(), label: addedLabel, children: [] });
        } else if (level === 2) {
            newOptions[parentIndices[0]].children = newOptions[parentIndices[0]].children || [];
            newOptions[parentIndices[0]].children.push({ id: generateId(), label: addedLabel, children: [] });
        } else if (level === 3) {
            newOptions[parentIndices[0]].children[parentIndices[1]].children = newOptions[parentIndices[0]].children[parentIndices[1]].children || [];
            newOptions[parentIndices[0]].children[parentIndices[1]].children.push({ id: generateId(), label: addedLabel });
        }

        setAddState({ level: null, parentIndices: [] });
        setNewLabel("");
        await saveToJira(newOptions);
    };

    const removeLevel = async (level, indices) => {
        let newOptions = [...config.options];
        if (level === 1) {
            newOptions.splice(indices[0], 1);
        } else if (level === 2) {
            newOptions[indices[0]].children.splice(indices[1], 1);
        } else if (level === 3) {
            newOptions[indices[0]].children[indices[1]].children.splice(indices[2], 1);
        }
        await saveToJira(newOptions);
    };

    if (loading) return <Text>Cargando configuración...</Text>;

    return (
        <Box>
            <Text>Configuración de Triple Cascada</Text>

            {addState.level !== null && (
                <Box xcss={{ padding: "10px", border: "1px solid #ccc", marginBottom: "10px", marginTop: "10px" }}>
                    <Text>Agregando nuevo elemento de Nivel {addState.level}...</Text>
                    <Form onSubmit={confirmAdd}>
                        <Label labelFor="lbl">Nombre de la opción</Label>
                        <Textfield name="label" id="lbl" onChange={(e) => setNewLabel(e.target.value)} />
                        <Button type="submit" appearance="primary">Guardar Nivel</Button>
                        <Button onClick={() => setAddState({ level: null, parentIndices: [] })}>Cancelar</Button>
                    </Form>
                </Box>
            )}

            {addState.level === null && (
                <Box>
                    <Button onClick={addLevel1}>+ Agregar Nivel 1</Button>
                    {config.options?.map((l1, i1) => (
                        <Box key={l1.id} xcss={{ paddingLeft: '10px', marginTop: '10px', borderLeft: '2px solid #ccc' }}>
                            <Stack alignInline="start" space="space.100">
                                <Text>*** L1: {l1.label}</Text>
                                <Button onClick={() => addLevel2(i1)}>+ Agregar L2 a {l1.label}</Button>
                                <Button appearance="danger" onClick={() => removeLevel(1, [i1])}>Eliminar L1</Button>
                            </Stack>

                            {l1.children?.map((l2, i2) => (
                                <Box key={l2.id} xcss={{ paddingLeft: '20px', marginTop: '5px', borderLeft: '2px dashed #ccc' }}>
                                    <Stack alignInline="start" space="space.100">
                                        <Text>*** L2: {l2.label}</Text>
                                        <Button onClick={() => addLevel3(i1, i2)}>+ Agregar L3 a {l2.label}</Button>
                                        <Button appearance="danger" onClick={() => removeLevel(2, [i1, i2])}>Eliminar L2</Button>
                                    </Stack>

                                    {l2.children?.map((l3, i3) => (
                                        <Box key={l3.id} xcss={{ paddingLeft: '30px', marginTop: '5px' }}>
                                            <Stack alignInline="start" space="space.100">
                                                <Text>*** L3: {l3.label}</Text>
                                                <Button appearance="danger" onClick={() => removeLevel(3, [i1, i2, i3])}>Eliminar L3</Button>
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
