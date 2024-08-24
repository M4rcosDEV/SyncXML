// renderer.js


const opcoesArray = [
    { id: 1, nome: "Opção 1" },
    { id: 2, nome: "Opção 2" },
    { id: 3, nome: "Opção 3" },
    { id: 4, nome: "Opção 4" }
];

//musica
function tocarMusica() {
    var audio = document.getElementById("audioPlayer");
    audio.play();
}

const audio = document.getElementById('audioPlayer');
        const muteButton = document.getElementById('btn-mute');
        const muteIcon = document.getElementById('mute');

        muteButton.addEventListener('click', () => {
            if (audio.muted) {
                audio.muted = false;
                muteIcon.classList.remove('fa-volume-mute');
                muteIcon.classList.add('fa-volume-up');
            } else {
                audio.muted = true;
                muteIcon.classList.remove('fa-volume-up');
                muteIcon.classList.add('fa-volume-mute');
            }
        });


// Obtém o elemento <select> do HTML
const selectElement = document.getElementById('opcoes');

// Itera sobre o array e cria uma <option> para cada objeto
opcoesArray.forEach(opcao => {
    const optionElement = document.createElement('option');
    optionElement.value = opcao.id; // Define o valor da opção como o ID do objeto
    optionElement.textContent = opcao.nome; // Define o texto da opção como o nome do objeto
    selectElement.appendChild(optionElement);
});


// Função para capturar a opção selecionada
selectElement.addEventListener('change', function() {
    const selectedOption = selectElement.options[selectElement.selectedIndex];
    const resultado = `Você escolheu: ${selectedOption.text} (ID: ${selectedOption.value})`;
    
    // Exibe o resultado
    document.getElementById('resultado').textContent = resultado;
});

const formatarObjeto = (objeto) => {
    console.log('Objeto atual:', objeto);
    if(objeto.numeroExtraido== -1){
        return `Arquivo: "${objeto.arquivo}", XML SEM PROTOCOLO VERIFIQUE"`;
    }else{
        return `Arquivo: "${objeto.arquivo}", Numero da nota: "${objeto.numeroExtraido}" <br>
        <p id="teste">"${objeto.dataExtraida}"</p>`;
    }
  
};

const formatarNotaNaoEncontrada = (numero) => {
    return `Numero da nota não encontrada: "${numero}"`;
};

const formatarValorEmReais = (valor) => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(valor);
};


function scrollToDiv() {
    const notasnot = document.getElementById('notasnot');
    notasnot.scrollIntoView({ behavior: 'smooth' });
}

document.getElementById('configForm').addEventListener('submit', async (event) => {
    event.preventDefault(); 

    const nomeBanco = document.getElementById('nomeBanco').value;
    const senhaBanco = document.getElementById('senhaBanco').value;
    const informacao = document.getElementById('container');
    const dataini = document.getElementById('dataini').value;
    const datafim = document.getElementById('datafim').value;
	
    try {
        const resposta = await window.api.enviarConfig({
            nomeBanco,
            senhaBanco,
            dataini,
            datafim
        });

        console.log('Resposta do backend:', resposta);
        // Atualizar a interface com a resposta recebida

        const valorTotalXML = resposta.valoresExtraidos
        .map(valor => parseFloat(valor)) // Converte as strings para números
        .reduce((acumulador, valorAtual) => acumulador + valorAtual, 0); // Soma todos os valores

        console.log('Somatorio', valorTotalXML);

        const resultadosElement = document.getElementById('resultados');
        const numerosNaoPresentesElement = document.getElementById('numerosNaoPresentes');

        resultadosElement.innerHTML = '';
        numerosNaoPresentesElement.innerHTML = '';

        // resultadosElement.textContent = JSON.stringify(resposta.resultados, null, 2);
        const resultado = resposta.resultados.map(formatarObjeto).join('\n\n');
        resultadosElement.innerHTML = resultado;
        resultadosElement.classList.add('active');
        
        if(resposta.numerosNaoPresentes == '' || resposta.numerosNaoPresentes == 0 || resposta.numerosNaoPresentes==null){
            $('#myModal').modal('show');
            resultadosElement.textContent = 'O pai verifico relaxa'

        }
        const notasNaoEncontradas = resposta.numerosNaoPresentes.map(formatarNotaNaoEncontrada).join('\n\n');
        numerosNaoPresentesElement.textContent = notasNaoEncontradas;
        
        const vlrnotas = document.getElementById('vlrnotas');

        // Formatar o valor das notas do banco
        if (typeof resposta.valorNotas === 'number' && !isNaN(resposta.valorNotas)) {
            vlrnotas.textContent = `Valor das notas: ${formatarValorEmReais(resposta.valorNotas)}`;
        } else {
            // Se não for número válido, tentar converter
            const valorConvertido = parseFloat(resposta.valorNotas);
            if (!isNaN(valorConvertido)) {
                vlrnotas.textContent = `Valor das notas nesse periodo no sistema: ${formatarValorEmReais(valorConvertido)}`;
            } else {
                vlrnotas.textContent = 'Valor das notas não disponível';
            }
        }
        const vlrnotasxml = document.getElementById('vlrnotasxml');
        // Formatar o valor das notas do XML
        if (typeof valorTotalXML === 'number' && !isNaN(valorTotalXML)) {
            vlrnotasxml.textContent = `Valor das notas do XML: ${formatarValorEmReais(valorTotalXML)}`;
        } else {
            // Se não for número válido, tentar converter
            const valorConvertido = parseFloat(valorTotalXML);
            if (!isNaN(valorConvertido)) {
                vlrnotasxml.textContent = `Valor das notas do XML: ${formatarValorEmReais(valorConvertido)}`;
            } else {
                vlrnotasxml.textContent = 'Valor das notas do XML não disponível';
            }
        }

        console.log('Numero nota:',resposta.resultados,'Data:', resposta.datasExtraidas) 

        //numerosNaoPresentesElement.textContent = JSON.stringify(resposta.numerosNaoPresentes, null, 2);

        // Atualizar o total de XMLs
        const totalElement = document.getElementById('totalXMLs');
        totalElement.textContent = `Total de XMLs processados: ${resposta.total}`;
		informacao.classList.add('active')

    } catch (error) {
        console.error('Erro ao enviar configurações:', error);
        //alert('Erro ao enviar configurações!');
		
    }
    
    
});

document.getElementById('open-directory').addEventListener('click', async () => {
  const directoryPath = await window.api.openDirectoryDialog();
  if (directoryPath) {
      document.getElementById('directory-path').innerText = `Diretório Selecionado: ${directoryPath}`;
      // Enviar o diretório selecionado para o backend
      await window.api.sendDirectoryPath(directoryPath);
  } else {
      document.getElementById('directory-path').innerText = 'Nenhum diretório selecionado.';
  }
});


// document.addEventListener('DOMContentLoaded', async () => {
//     try {
//         const dados = await window.electron.processarDados(); // Se necessário

//         console.log('Dados recebidos do processo principal:', dados);

//         // Limpar o conteúdo existente
//         resultadosElement.innerHTML = '';
//         numerosNaoPresentesElement.innerHTML = '';

//         // Atualizar a interface com os dados recebidos
//         const resultadosElement = document.getElementById('resultados');
//         //resultadosElement.textContent = JSON.stringify(dados.resultados, null, 2);
//         const resultado = dados.resultados.map(formatarObjeto).join('\n');
//         resultadosElement.textContent = resultado;


//         const numerosNaoPresentesElement = document.getElementById('numerosNaoPresentes');
//         numerosNaoPresentesElement.textContent = JSON.stringify(dados.numerosNaoPresentes, null, 2);

//         // Atualizar o total de XMLs
//         const totalElement = document.getElementById('totalXMLs');
//         totalElement.textContent = `Total de XMLs processados: ${dados.total}`;
//     } catch (error) {
//         //console.error('Erro ao obter dados:', error);
//     }
// });
