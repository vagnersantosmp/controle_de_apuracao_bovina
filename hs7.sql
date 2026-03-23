-- SCRIPT PARA GERAR DADOS DE TESTE NO DASHBOARD
-- Este script irá inserir apurações fictícias entre 2 de Janeiro de 2026 e 2 de Março de 2026.
-- IMPORTANTE: Todas as apurações geradas terão o status de 'teste_bi' no campo observacao para podermos limpar depois.

DO $$
DECLARE
    cur_date DATE := '2026-01-02';
    end_date DATE := '2026-03-02';
    loja_row RECORD;
    corte_row RECORD;
    metodo TEXT;
    nova_apuracao_id UUID;
    peso_ini NUMERIC;
    perda_pct NUMERIC;
    peso_fin NUMERIC;
    perda_kg NUMERIC;
    rand_metodo INT;
BEGIN
    WHILE cur_date <= end_date LOOP
        -- Para cada semana, pegar 3 lojas aleatórias
        FOR loja_row IN (SELECT id FROM lojas WHERE ativa = true ORDER BY random() LIMIT 3) LOOP
            
            -- Sortear uma metodologia (1=boi_no_osso, 2=nota_10, 3=embalada)
            rand_metodo := floor(random() * 3 + 1);
            IF rand_metodo = 1 THEN metodo := 'boi_no_osso';
            ELSIF rand_metodo = 2 THEN metodo := 'nota_10';
            ELSE metodo := 'embalada';
            END IF;

            -- Inserir a apuração mockada
            INSERT INTO apuracoes (loja_id, tipo_apuracao, data_apuracao, responsavel, status, observacoes)
            VALUES (
                loja_row.id, 
                metodo, 
                cur_date + (floor(random() * 6) || ' days')::interval, -- data aleatoria na semana
                'Sistema Gerador (Teste)', 
                'concluido',
                'TESTE_BI_DELETE_DEPOIS'
            ) RETURNING id INTO nova_apuracao_id;

            -- Para cada apuração, pegar de 3 a 5 cortes daquela metodologia
            FOR corte_row IN (SELECT id FROM cortes WHERE ativo = true AND metodologia = metodo ORDER BY random() LIMIT floor(random() * 3 + 3)) LOOP
                
                peso_ini := round((random() * 40 + 10)::numeric, 2); -- entre 10 e 50kg
                perda_pct := round((random() * 0.15 + 0.02)::numeric, 4); -- entre 2% e 17%
                peso_fin := round((peso_ini * (1 - perda_pct))::numeric, 2);
                perda_kg := peso_ini - peso_fin;

                INSERT INTO itens_apuracao (apuracao_id, corte_id, peso_inicial, peso_final, perda_kg, perda_percentual)
                VALUES (nova_apuracao_id, corte_row.id, peso_ini, peso_fin, perda_kg, (perda_pct * 100));
                
            END LOOP;
        END LOOP;

        cur_date := cur_date + interval '7 days';
    END LOOP;
END $$;
