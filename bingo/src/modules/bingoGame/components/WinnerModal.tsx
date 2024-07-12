interface WinnerModalProps {
    onClose: () => void;
    winnerCards: number[];
}
const WinnerModal:React.FC<WinnerModalProps> = ({ winnerCards }) => {
    const winners = winnerCards.length
    console.log(winnerCards.slice(-3).join(', '));
    return(
        <div className="">
            <span>¡Hay {winners} ganadores !</span>
            { winnerCards[0] }
        </div>
    )
}
export default WinnerModal;