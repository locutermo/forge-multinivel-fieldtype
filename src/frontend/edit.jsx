import React, { useState, useEffect } from 'react';
import ForgeReconciler, { Select, Button, Text, Box, Form, Label } from '@forge/react';
import { invoke, view } from '@forge/bridge';

const EditField = () => {
    const [loading, setLoading] = useState(true);
    const [config, setConfig] = useState(null);

    const [level1List, setLevel1List] = useState([]);
    const [level2List, setLevel2List] = useState([]);
    const [level3List, setLevel3List] = useState([]);

    const [selectedL1, setSelectedL1] = useState(null);
    const [selectedL2, setSelectedL2] = useState(null);
    const [selectedL3, setSelectedL3] = useState(null);

    useEffect(() => {
        const init = async () => {
            const data = await invoke('getConfig');
            setConfig(data);
            if (data && data.options) {
                setLevel1List(data.options);
            }
            setLoading(false);
        };
        init();
    }, []);

    const handleL1Change = (selected) => {
        const valStr = selected ? selected.value : null;
        setSelectedL1(valStr);
        setSelectedL2(null);
        setSelectedL3(null);
        setLevel3List([]);

        const l1Obj = config.options?.find(o => o.label === valStr);
        if (l1Obj && l1Obj.children) {
            setLevel2List(l1Obj.children);
        } else {
            setLevel2List([]);
        }
    };

    const handleL2Change = (selected) => {
        const valStr = selected ? selected.value : null;
        setSelectedL2(valStr);
        setSelectedL3(null);

        const l1Obj = config.options?.find(o => o.label === selectedL1);
        const l2Obj = l1Obj?.children?.find(o => o.label === valStr);
        if (l2Obj && l2Obj.children) {
            setLevel3List(l2Obj.children);
        } else {
            setLevel3List([]);
        }
    };

    const handleL3Change = (selected) => {
        const valStr = selected ? selected.value : null;
        setSelectedL3(valStr);
    };

    const submit = async () => {
        const value = {
            level1: selectedL1,
            level2: selectedL2,
            level3: selectedL3
        };
        await view.submit(value);
    };

    if (loading) return <Text>Cargando opciones...</Text>;

    return (
        <Form onSubmit={submit}>
            <Label labelFor="s1">Nivel 1</Label>
            <Select id="s1" name="l1" onChange={handleL1Change}
                options={level1List.map(opt => ({ label: opt.label, value: opt.label }))} />

            {selectedL1 && level2List.length > 0 && (
                <Box>
                    <Label labelFor="s2">Nivel 2</Label>
                    <Select id="s2" name="l2" onChange={handleL2Change}
                        options={level2List.map(opt => ({ label: opt.label, value: opt.label }))} />
                </Box>
            )}

            {selectedL2 && level3List.length > 0 && (
                <Box>
                    <Label labelFor="s3">Nivel 3</Label>
                    <Select id="s3" name="l3" onChange={handleL3Change}
                        options={level3List.map(opt => ({ label: opt.label, value: opt.label }))} />
                </Box>
            )}

            <Button type="submit" appearance="primary">Guardar Valor</Button>
        </Form>
    );
};

ForgeReconciler.render(<EditField />);
